const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const fs =
  require('node:fs');

const path =
  require('node:path');


const source =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'src',
      'modules',
      'domain',
      'domain.controller.js'
    ),
    'utf8'
  );


test(
  'F126-CAMP-001 campañas siguen activas por defecto',
  () => {
    assert.match(
      source,
      /activeOnly\s*:\s*!incluirInactivas/
    );
  }
);


test(
  'F126-CAMP-002 soporta incluirInactivas',
  () => {
    assert.match(
      source,
      /query\.incluirInactivas/
    );

    assert.match(
      source,
      /incluirInactivas/
    );
  }
);


test(
  'F126-CAMP-003 conserva filtro quiebreId',
  () => {
    assert.match(
      source,
      /query\.quiebreId/
    );

    assert.match(
      source,
      /this\.service\.listCampaigns/
    );
  }
);