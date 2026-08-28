const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    'src',
    'modules',
    'domain',
    'domain.repository.js'
  ),
  'utf8'
);


test(
  'F123-REPO-001 conserva campañas por quiebre',
  () => {
    assert.match(
      source,
      /async\s+listCampaignsByBreak\s*\(/
    );
  }
);


test(
  'F123-REPO-002 obtiene campaña por id',
  () => {
    assert.match(
      source,
      /async\s+getCampaignById\s*\(/
    );

    assert.match(
      source,
      /WHERE\s+c\.id\s*=\s*\$1/i
    );
  }
);


test(
  'F123-REPO-003 crea campaña con quiebre',
  () => {
    assert.match(
      source,
      /async\s+createCampaign\s*\(/
    );

    assert.match(
      source,
      /INSERT\s+INTO\s+campanas/i
    );

    assert.match(
      source,
      /quiebre_id/i
    );
  }
);


test(
  'F123-REPO-004 actualiza campaña y quiebre',
  () => {
    assert.match(
      source,
      /async\s+updateCampaign\s*\(/
    );

    assert.match(
      source,
      /UPDATE\s+campanas/i
    );

    assert.match(
      source,
      /quiebre_id\s*=\s*\$4/i
    );
  }
);


test(
  'F123-REPO-005 baja lógica no elimina campaña',
  () => {
    assert.match(
      source,
      /async\s+setCampaignActive\s*\(/
    );

    assert.doesNotMatch(
      source,
      /DELETE\s+FROM\s+campanas/i
    );
  }
);