const API_KEY = 'AIzaSyAgJNOvprLjiLIFf6ciKzDBU05b6ujEXB0';
const PROJECT_ID = 'shadow-slave-life-os';

async function checkLootTableFiltered() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'loot_table' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'is_active' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      },
      limit: 1
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

checkLootTableFiltered();
