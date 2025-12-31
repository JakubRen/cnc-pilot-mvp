const fs = require('fs');
const path = require('path');

// Create directories
const dirs = [
  'app/production',
  'app/production/create',
  'app/production/[id]'
];

dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

console.log('Directories created successfully');
