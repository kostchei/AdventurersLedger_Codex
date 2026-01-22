/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "select_global_role",
    "maxSelect": 1,
    "name": "global_role",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "USER",
      "GM",
      "ADMIN"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("select_global_role")

  return app.save(collection)
})
