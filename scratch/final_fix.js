const fs = require('fs');
const path = 'public/mobile/js/app.js';
let txt = fs.readFileSync(path, 'utf8');

// Fix handleCreatePost and handleCreateAndPublish
const search = /if\s*\(imageInput\.files\[0\]\)\s*\{\s*formData\.append\('image',\s*imageInput\.files\[0\]\);\s*\}/g;
const replace = `if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    } else if (currentImageBase64) {
        formData.append('image', currentImageBase64);
    }`;

txt = txt.replace(search, replace);

fs.writeFileSync(path, txt);
console.log('Fixed app.js successfully');
