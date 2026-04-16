const { execSync } = require('child_process');

try {
  const token = execSync('firebase auth:print-access-token').toString().trim();
  const projectId = 'shadow-slave-life-os';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/loot_table?pageSize=100`;
  
  const response = execSync(`curl -s -H "Authorization: Bearer ${token}" "${url}"`).toString();
  const data = JSON.parse(response);
  
  if (data.documents) {
    console.log(`Current items in loot_table: ${data.documents.length}`);
    console.log('Sample names:', data.documents.slice(0, 5).map(d => d.fields.name.stringValue).join(', '));
  } else {
    console.log('loot_table is empty or not found.');
  }
} catch (e) {
  console.error('Error fetching loot_table:', e.message);
}
