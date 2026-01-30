import pug from 'pug';

try {
  const fn = pug.compileFile('./src/views/index.pug');
  console.log('✓ Pug compilation successful');

  // Test render
  const html = fn({
    statusClass: 'status-fine',
    emoji: '✅',
    message: 'Test',
    metrics: { totalServices: 100, percentDelayed: 10, percentCancelled: 5 },
    timestamp: 'now',
    stale: false
  });

  if (html.includes('transit-boxes')) {
    console.log('✓ transit-boxes section is present in output');
  } else {
    console.log('✗ transit-boxes section NOT found in output');
  }
} catch(e) {
  console.error('✗ Pug error:', e.message);
  process.exit(1);
}
