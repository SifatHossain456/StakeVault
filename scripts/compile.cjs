const solc = require('solc');
const fs   = require('fs');
const path = require('path');

const contracts = ['SimpleToken', 'StakingPool'];

for (const name of contracts) {
  console.log(`⚙️  Compiling ${name}.sol...`);
  const src = fs.readFileSync(path.join(__dirname, `../contracts/${name}.sol`), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { [`${name}.sol`]: { content: src } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors?.some(e => e.severity === 'error')) {
    console.error(output.errors.filter(e => e.severity === 'error').map(e => e.message).join('\n'));
    process.exit(1);
  }
  const contract = output.contracts[`${name}.sol`][name];
  const abi      = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;
  const upper    = name.toUpperCase();
  const fns      = abi.filter(x => x.type === 'function').map(x => x.name).join(', ');
  const outPath  = path.join(__dirname, `../lib/contracts/${name}.ts`);
  fs.writeFileSync(outPath,
    `// AUTO-GENERATED — run: npm run compile\n/* eslint-disable */\n` +
    `export const ${upper}_ABI = ${JSON.stringify(abi, null, 2)} as const;\n` +
    `export const ${upper}_BYTECODE = '${bytecode}' as \`0x\${string}\`;\n`
  );
  console.log(`✅ ${name} → lib/contracts/${name}.ts | functions: ${fns}`);
}
