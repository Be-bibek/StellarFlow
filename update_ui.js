const fs = require('fs');
const path = require('path');

const viewsDir = 'd:/flutter_main/Bibek/web-3/components/views';

function ensureBentoCardImport(content) {
  if (!content.includes('import { BentoCard }')) {
    return content.replace(
      /import React([^;]*);/,
      "import React$1;\nimport { BentoCard } from '@/components/ui/bento-card';"
    );
  }
  return content;
}

// ---------------------------------------------------------
// 1. Update governance-view.tsx
// ---------------------------------------------------------
let gov = fs.readFileSync(path.join(viewsDir, 'governance-view.tsx'), 'utf8');
gov = ensureBentoCardImport(gov);
gov = gov.replace(
  /<div className="bg-white dark:bg-\[#110E1C\] border border-slate-200 dark:border-white\/10 rounded-2xl p-6">/g,
  '<BentoCard className="flex flex-col">'
);
gov = gov.replace(/<\/div>\s*\{\/\* Pending Approvals \*\/\}/g, '</BentoCard>\n\n      {/* Pending Approvals */}');
gov = gov.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\s*\/\* Panel B/g, '</BentoCard>\n      </div>\n    </div>\n  );\n}\n\n// ─────────────────────────────────────────────────────────────────────────────\n// Panel B');
gov = gov.replace(/<div className="xl:col-span-2 bg-white dark:bg-\[#110E1C\] border border-slate-200 dark:border-white\/10 rounded-2xl p-6">/g, '<BentoCard className="xl:col-span-2 flex flex-col">');
gov = gov.replace(/<\/div>\s*\{\/\* Timeline detail \*\/\}/g, '</BentoCard>\n\n      {/* Timeline detail */}');
gov = gov.replace(/<div className="xl:col-span-3 bg-white dark:bg-\[#110E1C\] border border-slate-200 dark:border-white\/10 rounded-2xl p-6">/g, '<BentoCard className="xl:col-span-3 flex flex-col">');
gov = gov.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*\/\* Panel C/g, '</BentoCard>\n    </div>\n  );\n}\n\n// ─────────────────────────────────────────────────────────────────────────────\n// Panel C');
gov = gov.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/g, '</BentoCard>\n    </div>\n  );\n}\n');
fs.writeFileSync(path.join(viewsDir, 'governance-view.tsx'), gov);

// ---------------------------------------------------------
// 2. Update funding-view.tsx
// ---------------------------------------------------------
let fund = fs.readFileSync(path.join(viewsDir, 'funding-view.tsx'), 'utf8');
fund = ensureBentoCardImport(fund);
// Update KPI Cards from motion.div to BentoCard
fund = fund.replace(
  /<motion\.div\s+key=\{kpi\.label\}\s+initial=\{\{ opacity: 0, y: 8 \}\}\s+animate=\{\{ opacity: 1, y: 0 \}\}\s+transition=\{\{ delay: i \* 0\.08 \}\}\s+className="bg-white dark:bg-\[#110E1C\] border border-slate-200 dark:border-white\/10 rounded-2xl p-5"\s*>/g,
  '<BentoCard\n            key={kpi.label}\n            initial={{ opacity: 0, y: 8 }}\n            animate={{ opacity: 1, y: 0 }}\n            transition={{ delay: i * 0.08 }}\n            className="flex flex-col"\n          >'
);
fund = fund.replace(
  /<\/p>\s*<\/motion\.div>/g,
  '</p>\n          </BentoCard>'
);
fs.writeFileSync(path.join(viewsDir, 'funding-view.tsx'), fund);

console.log('UI updates completed successfully.');
