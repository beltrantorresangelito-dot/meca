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
  'F124-REPO-001 conserva listado por quiebre',
  () => {
    assert.match(
      source,
      /async\s+listMatricesByBreak\s*\(/
    );
  }
);


test(
  'F124-REPO-002 obtiene matriz por id',
  () => {
    assert.match(
      source,
      /async\s+getMatrixById\s*\(/
    );

    assert.match(
      source,
      /WHERE\s+m\.id\s*=\s*\$1/i
    );
  }
);


test(
  'F124-REPO-003 crea matriz con quiebre de origen',
  () => {
    assert.match(
      source,
      /async\s+createMatrix\s*\(/
    );

    assert.match(
      source,
      /INSERT\s+INTO\s+matrices/i
    );

    assert.match(
      source,
      /quiebre_id/i
    );
  }
);


test(
  'F124-REPO-004 actualiza matriz',
  () => {
    assert.match(
      source,
      /async\s+updateMatrix\s*\(/
    );

    assert.match(
      source,
      /UPDATE\s+matrices/i
    );

    assert.match(
      source,
      /updated_at\s*=\s*NOW\s*\(\s*\)/i
    );
  }
);


test(
  'F124-REPO-005 baja lógica no elimina matriz',
  () => {
    assert.match(
      source,
      /async\s+setMatrixActive\s*\(/
    );

    assert.doesNotMatch(
      source,
      /DELETE\s+FROM\s+matrices/i
    );
  }
);