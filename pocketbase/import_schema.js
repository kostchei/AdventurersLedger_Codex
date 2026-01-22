const fs = require('fs');
const path = require('path');
const PocketBase = require('../frontend/node_modules/pocketbase/dist/pocketbase.cjs.js');

const schemaPath = path.join(__dirname, 'pb_schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
    console.log("Authenticating...");
    await pb.collection('_superusers').authWithPassword('antigravity@local.host', 'password123456');
    console.log("Auth successful.");

    // Cleanup custom collections to ensure clean schema (fixes ID locked issues)
    const toDelete = ['campaign_nominations', 'campaign_memberships', 'campaigns', 'decals', 'world_state', 'fog_of_war', 'users_stats'];
    for (const name of toDelete) {
        try {
            await pb.collections.delete(name);
            console.log(`Cleanup: Deleted ${name}`);
        } catch (e) { }
    }

    // Helper to fix definitions
    async function prepareDef(colDef) {
        // Clone
        const def = JSON.parse(JSON.stringify(colDef));

        if (def.fields) {
            // Remove ID field entirely (let system handle it to avoid validation locks)
            def.fields = def.fields.filter(f => f.name !== 'id');

            for (const f of def.fields) {
                // Fix Select (Flatten options)
                if (f.type === 'select') {
                    if (f.options) {
                        // If options is array [v1, v2], assume it's values.
                        // If object { values: ... }, merge it.

                        let opts = f.options;
                        if (Array.isArray(opts)) {
                            // Convert generic internal format to object if needed, then spread?
                            // But server says 'values' cannot be blank on the field.
                            // So we set f.values directly.
                            const vals = opts.map(o => (typeof o === 'object' && o.value) ? o.value : o);
                            f.values = vals;
                            f.maxSelect = f.maxSelect || 1;
                        } else if (typeof opts === 'object') {
                            if (opts.values) f.values = opts.values;
                            if (opts.maxSelect) f.maxSelect = opts.maxSelect;
                        }

                        // Clear options to avoid confusion? Or keep it?
                        // If we set f.values, usually f.options is deprecated/ignored.
                        // deleting f.options might be safer.
                        delete f.options;
                    }
                }

                // Fix Relation IDs
                if (f.type === 'relation' && f.collectionId) {
                    // Find target in schema to get name
                    const targetMatch = schema.find(c => c.id === f.collectionId);
                    if (targetMatch) {
                        try {
                            const actual = await pb.collections.getOne(targetMatch.name);
                            if (actual.id !== f.collectionId) {
                                console.log(`    Fixing relation ${f.name}: ${f.collectionId} -> ${actual.id} (${actual.name})`);
                                f.collectionId = actual.id;
                            }
                        } catch (e) { }
                    }
                }
            }
        }
        return def;
    }

    // PASS 1: Fields Only (Strip rules)
    console.log("--- PASS 1: Structure ---");
    for (const rawDef of schema) {
        if (rawDef.name === '_superusers') continue;

        const def = await prepareDef(rawDef);

        // Strip rules for creation to avoid validation errors
        const rules = {
            listRule: def.listRule,
            viewRule: def.viewRule,
            createRule: def.createRule,
            updateRule: def.updateRule,
            deleteRule: def.deleteRule
        };

        def.listRule = null;
        def.viewRule = null;
        def.createRule = null;
        def.updateRule = null;
        def.deleteRule = null;

        try {
            let existing;
            try { existing = await pb.collections.getOne(def.name); } catch (e) { }

            if (existing) {
                console.log(`  Updating ${def.name} (Structure)...`);
                if (def.name === 'users') {
                    // Special merge for users
                    const newFields = existing.fields.filter(f => f.name !== 'global_role');
                    const gr = def.fields.find(f => f.name === 'global_role');
                    if (gr) {
                        console.log("    Appending global_role:", JSON.stringify(gr));
                        newFields.push(gr);
                    }
                    delete def.fields; // Don't overwrite fields with standard update yet
                    existing.fields = newFields; // Set merged

                    // We must send 'fields' in the update
                    await pb.collections.update(existing.id, existing);
                } else {
                    await pb.collections.update(existing.id, def);
                }
            } else {
                console.log(`  Creating ${def.name} (Structure)...`);
                await pb.collections.create(def);
            }
        } catch (e) {
            console.error(`  Failed Pass 1 for ${def.name}:`, e.message, JSON.stringify(e.response?.data || {}));
        }
    }

    // PASS 2: Rules
    console.log("--- PASS 2: Rules ---");
    for (const rawDef of schema) {
        if (rawDef.name === '_superusers') continue;

        const def = await prepareDef(rawDef); // re-resolve IDs

        try {
            const existing = await pb.collections.getOne(def.name);
            if (existing) {
                console.log(`  Applying Rules to ${def.name}...`);
                await pb.collections.update(existing.id, {
                    listRule: def.listRule,
                    viewRule: def.viewRule,
                    createRule: def.createRule,
                    updateRule: def.updateRule,
                    deleteRule: def.deleteRule
                });
            }
        } catch (e) {
            console.error(`  Failed Pass 2 for ${def.name}:`, e.message);
        }
    }

    // Seed Data
    console.log("--- Seeding Users ---");
    try {
        const email = 'ashley.stevens.hoare@gmail.com';
        try {
            await pb.collection('users').create({
                email: email,
                password: 'password123456',
                passwordConfirm: 'password123456',
                name: 'Ashley GM',
                global_role: 'GM',
                verified: true
            });
            console.log("  Created Ashley.");
        } catch (e) {
            // If exists, update
            const u = await pb.collection('users').getFirstListItem(`email="${email}"`);
            await pb.collection('users').update(u.id, { global_role: 'GM' });
            console.log("  Updated Ashley.");
        }
    } catch (e) {
        console.error("  Seeding failed:", e.message);
    }
}

run().catch(e => console.error(e));
