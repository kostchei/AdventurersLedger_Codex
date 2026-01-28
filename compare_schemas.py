import json

def compare_schemas(file1, file2):
    with open(file1, 'r', encoding='utf-8') as f:
        schema1 = json.load(f)
    with open(file2, 'r', encoding='utf-8') as f:
        schema2 = json.load(f)

    names1 = {coll['name'] for coll in schema1}
    names2 = {coll['name'] for coll in schema2}

    print(f"File 1: {file1}")
    print(f"File 2: {file2}")
    print(f"\nCollections in {file1} but not in {file2}:")
    print(names1 - names2)
    print(f"\nCollections in {file2} but not in {file1}:")
    print(names2 - names1)

if __name__ == "__main__":
    compare_schemas(
        r'd:\Code\AdventurersLedger\AG\Download of existing\pb_schema.json',
        r'd:\Code\AdventurersLedger\AG\pocketbase\pb_schema.json'
    )
