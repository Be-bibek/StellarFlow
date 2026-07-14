const fs = require('fs');

function replaceDivWithBentoCard(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (!code.includes('import { BentoCard }')) {
    code = code.replace(
      /import React([^;]*);/,
      "import React$1;\nimport { BentoCard } from '@/components/ui/bento-card';"
    );
  }

  const targetClass = 'className="bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6';
  const targetClassAlt = 'className="xl:col-span-2 bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6"';
  const targetClassAlt2 = 'className="xl:col-span-3 bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6"';
  const targetClassAlt3 = 'className="bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-5"';

  function replaceAllMatches(str, classStr, newProps) {
    let result = str;
    while (true) {
      let startIndex = result.indexOf(`<div ${classStr}`);
      if (startIndex === -1) break;

      let depth = 0;
      let endIndex = -1;
      
      // Find the closing tag
      // We will search for <div and </div from startIndex
      let i = startIndex + 1;
      while (i < result.length) {
        if (result.substring(i, i + 4) === '<div' && !result.substring(i, i + 5).match(/<div[A-Za-z]/)) {
          depth++;
          i += 4;
        } else if (result.substring(i, i + 6) === '</div' && !result.substring(i, i + 7).match(/<\/div[A-Za-z]/)) {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
          i += 6;
        } else {
          i++;
        }
      }

      if (endIndex !== -1) {
        // Replace opening tag
        let beforeOpen = result.substring(0, startIndex);
        let openTagLength = result.indexOf('>', startIndex) - startIndex + 1;
        let afterOpen = result.substring(startIndex + openTagLength, endIndex);
        let afterClose = result.substring(endIndex + 6);
        
        // We know it ends with > so we can just replace the whole opening tag string
        result = beforeOpen + `<BentoCard ${newProps}>` + afterOpen + '</BentoCard' + afterClose;
      } else {
        break;
      }
    }
    return result;
  }

  code = replaceAllMatches(code, targetClassAlt, 'className="xl:col-span-2 flex flex-col p-6"');
  code = replaceAllMatches(code, targetClassAlt2, 'className="xl:col-span-3 flex flex-col p-6"');
  code = replaceAllMatches(code, targetClassAlt3, 'className="flex flex-col p-6 space-y-5"');
  code = replaceAllMatches(code, targetClass, 'className="flex flex-col p-6"');

  fs.writeFileSync(filePath, code);
}

replaceDivWithBentoCard('d:/flutter_main/Bibek/web-3/components/views/governance-view.tsx');
console.log('Done!');
