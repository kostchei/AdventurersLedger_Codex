/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_camp_001")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.global_role = 'GM' || @request.auth.global_role = 'ADMIN'",
    "listRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id = dmId || @request.auth.id = pending_nomination_player_id",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_camp_001")

  // update collection data
  unmarshal({
    "createRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
})
