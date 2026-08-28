const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const fs =
  require('node:fs');

const path =
  require('node:path');


const controllerSource =
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


const routesSource =
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'src',
      'modules',
      'domain',
      'domain.routes.js'
    ),
    'utf8'
  );


test(
  'F125-HTTP-001 controller crea asignación',
  () => {
    assert.match(
      controllerSource,
      /async\s+createCampaignMatrixAssignment\s*\(/
    );

    assert.match(
      controllerSource,
      /createCampaignMatrixAssignment/
    );
  }
);


test(
  'F125-HTTP-002 controller actualiza asignación',
  () => {
    assert.match(
      controllerSource,
      /async\s+updateCampaignMatrixAssignment\s*\(/
    );

    assert.match(
      controllerSource,
      /updateCampaignMatrixAssignment/
    );
  }
);


test(
  'F125-HTTP-003 controller cambia estado asignación',
  () => {
    assert.match(
      controllerSource,
      /async\s+setCampaignMatrixAssignmentActive\s*\(/
    );

    assert.match(
      controllerSource,
      /setCampaignMatrixAssignmentActive/
    );
  }
);


test(
  'F125-HTTP-004 POST campana-matriz soportado',
  () => {
    assert.match(
      routesSource,
      /ruta\s*===\s*['"]\/api\/domain\/campana-matriz['"][\s\S]*metodo\s*===\s*['"]POST['"]/
    );
  }
);


test(
  'F125-HTTP-005 PUT usa id dinámico',
  () => {
    assert.match(
      routesSource,
      /api\\\/domain\\\/campana-matriz\\\/\(\\d\+\)/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PUT['"]/
    );
  }
);


test(
  'F125-HTTP-006 PATCH estado soportado',
  () => {
    assert.match(
      routesSource,
      /campana-matriz\\\/\(\\d\+\)\\\/estado/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PATCH['"]/
    );
  }
);


test(
  'F125-HTTP-007 no introduce DELETE físico',
  () => {
    assert.doesNotMatch(
      routesSource,
      /metodo\s*===\s*['"]DELETE['"][\s\S]*campana-matriz/
    );
  }
);