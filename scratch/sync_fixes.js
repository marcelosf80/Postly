const fs = require('fs');
const path = require('path');

const srcDir = 'c:/marketing/public/mobile';
const destDir = 'c:/marketing/public';

fs.copyFileSync(path.join(srcDir, 'js/app.js'), path.join(destDir, 'js/app.js'));
fs.copyFileSync(path.join(srcDir, 'js/api.js'), path.join(destDir, 'js/api.js'));
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(destDir, 'index.html'));

// Note: mobile.css might override main.css, let's just append the specific fixes to main.css
let mobileCSS = fs.readFileSync(path.join(srcDir, 'css/mobile.css'), 'utf8');
let mainCSS = fs.readFileSync(path.join(destDir, 'css/main.css'), 'utf8');
if (!mainCSS.includes('.phone-mockup {')) {
    fs.appendFileSync(path.join(destDir, 'css/main.css'), '\n' + mobileCSS);
}

console.log('Copied mobile fixes to public web version successfully.');
