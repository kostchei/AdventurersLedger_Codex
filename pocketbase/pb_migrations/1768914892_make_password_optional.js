/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Make password field optional to support OAuth authentication
  // OAuth users don't need a password since they authenticate through external providers
  collection.fields.forEach((field) => {
    if (field.name === "password") {
      field.required = false
    }
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Revert: make password required again
  collection.fields.forEach((field) => {
    if (field.name === "password") {
      field.required = true
    }
  })

  return app.save(collection)
})
