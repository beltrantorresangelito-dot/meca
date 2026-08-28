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
  'F125-REPO-001 conserva historial por campaña',
  () => {
    assert.match(
      source,
      /async\s+listCampaignMatrixAssignments\s*\(/
    );
  }
);


test(
  'F125-REPO-002 obtiene asignación por id',
  () => {
    assert.match(
      source,
      /async\s+getCampaignMatrixAssignmentById\s*\(/
    );

    assert.match(
      source,
      /WHERE\s+cm\.id\s*=\s*\$1/i
    );
  }
);


test(
  'F125-REPO-003 crea asignación con vigencias',
  () => {
    assert.match(
      source,
      /async\s+createCampaignMatrixAssignment\s*\(/
    );

    assert.match(
      source,
      /INSERT\s+INTO\s+campana_matriz/i
    );

    assert.match(
      source,
      /vigente_desde/i
    );

    assert.match(
      source,
      /vigente_hasta/i
    );
  }
);


test(
  'F125-REPO-004 actualiza asignación',
  () => {
    assert.match(
      source,
      /async\s+updateCampaignMatrixAssignment\s*\(/
    );

    assert.match(
      source,
      /UPDATE\s+campana_matriz/i
    );

    assert.match(
      source,
      /updated_at\s*=\s*NOW\s*\(\s*\)/i
    );
  }
);


test(
  'F125-REPO-005 baja lógica no elimina asignación',
  () => {
    assert.match(
      source,
      /async\s+setCampaignMatrixAssignmentActive\s*\(/
    );

    assert.doesNotMatch(
      source,
      /DELETE\s+FROM\s+campana_matriz/i
    );
  }
);