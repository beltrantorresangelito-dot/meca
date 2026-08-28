const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repositoryPath = path.join(
  __dirname,
  '..',
  'src',
  'modules',
  'domain',
  'domain.repository.js'
);

const source = fs.readFileSync(
  repositoryPath,
  'utf8'
);


test(
  'F122-REPO-001 conserva lectura de quiebres',
  () => {
    assert.match(
      source,
      /async\s+listBreaks\s*\(/
    );

    assert.match(
      source,
      /async\s+getBreakById\s*\(/
    );
  }
);


test(
  'F122-REPO-002 permite crear quiebres',
  () => {
    assert.match(
      source,
      /async\s+createBreak\s*\(/
    );

    assert.match(
      source,
      /INSERT\s+INTO\s+quiebres/i
    );

    assert.match(
      source,
      /RETURNING[\s\S]*codigo[\s\S]*nombre/i
    );
  }
);


test(
  'F122-REPO-003 permite actualizar quiebres',
  () => {
    assert.match(
      source,
      /async\s+updateBreak\s*\(/
    );

    assert.match(
      source,
      /UPDATE\s+quiebres/i
    );

    assert.match(
      source,
      /updated_at\s*=\s*NOW\s*\(\s*\)/i
    );
  }
);


test(
  'F122-REPO-004 baja lógica no elimina físicamente',
  () => {
    assert.match(
      source,
      /async\s+setBreakActive\s*\(/
    );

    assert.doesNotMatch(
      source,
      /DELETE\s+FROM\s+quiebres/i
    );
  }
);