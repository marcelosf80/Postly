const fs = require('fs');

const appPath = 'c:/marketing/public/mobile/js/app.js';
let appContent = fs.readFileSync(appPath, 'utf8');

// Replace garbled Editar and Eliminar buttons
appContent = appContent.replace(/<button class="btn btn-ghost btn-sm" onclick="editPost\('\$\{post\.id\}'\)">.*?Editar<\/button>/g, '<button class="btn btn-ghost btn-sm" onclick="editPost(\'${post.id}\')">✏️ Editar</button>');

appContent = appContent.replace(/<button class="btn btn-ghost btn-sm" onclick="deletePostAction\('\$\{post\.id\}'\)" style="color:var\(--danger\);">.*?<\/button>/g, '<button class="btn btn-ghost btn-sm" onclick="deletePostAction(\'${post.id}\')" style="color:var(--danger);">🗑️ Eliminar</button>');

// Also update how platform icon is formatted
// The "Sin texto" comes from undefined content. We already fixed api.js to use platform instead of network.
// Just ensuring that "undefined" platform doesn't print literally "undefined"
appContent = appContent.replace(/platformIcon\(post\.platform\) \+ ' ' \+ post\.platform/g, "platformIcon(post.platform) + ' ' + (post.platform || 'General')");
appContent = appContent.replace(/\$\{platformIcon\(post\.platform\)\} \$\{post\.platform\}/g, "${platformIcon(post.platform)} ${post.platform || 'General'}");


// Write back
fs.writeFileSync(appPath, appContent, 'utf8');
console.log('App.js fixes applied.');
