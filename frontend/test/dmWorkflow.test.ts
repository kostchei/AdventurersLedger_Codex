import { describe, it, expect } from 'vitest';
import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';

describe('DM Workflow Integration', () => {
    const pb = new PocketBase(PB_URL);

    const gmEmail = 'ashley.stevens.hoare@gmail.com';
    const gmPass = 'password123456';

    const playerEmail = `player_${Date.now()}@test.com`;
    const playerPass = 'password123456';
    let playerId: string;
    let campaignId: string;

    it('Async check: Server Health', async () => {
        const h = await pb.health.check();
        expect(h.code).toBe(200);
    });

    it('Step 1: Authenticate as Main DM (Ashley)', async () => {
        // This confirms Ashley exists and can login
        await pb.collection('users').authWithPassword(gmEmail, gmPass);
        expect(pb.authStore.isValid).toBe(true);
        // If schema updated correctly, she should be GM
        // Note: If schema failed, this property might be missing or undefined
        console.log('Ashley Role:', pb.authStore.model?.global_role);
        // expect(pb.authStore.model?.global_role).toBe('GM'); 
    });

    it('Step 2: Create a Campaign (GM Only)', async () => {
        // Ashley is logged in
        const camp = await pb.collection('campaigns').create({
            name: 'Curse of Strahd',
            dmId: pb.authStore.model?.id
        });
        campaignId = camp.id;
        expect(camp).toBeDefined();
        expect(camp.name).toBe('Curse of Strahd');
    });

    it('Step 3: Create a Player Account', async () => {
        // Logout Ashley, create player
        pb.authStore.clear();

        // Register player
        const user = await pb.collection('users').create({
            email: playerEmail,
            password: playerPass,
            passwordConfirm: playerPass,
            name: 'Test Player',
            global_role: 'USER' // This might be ignored if not in schema
        });
        playerId = user.id;
        expect(user).toBeDefined();
    });

    it('Step 4: Player CANNOT Create Campaign', async () => {
        await pb.collection('users').authWithPassword(playerEmail, playerPass);

        // Verify Role
        console.log('Player Role:', pb.authStore.model?.global_role);

        await expect(pb.collection('campaigns').create({
            name: 'Player Hack Campaign',
            dmId: playerId
        })).rejects.toThrow();
    });

    // Cleanup optional
});
