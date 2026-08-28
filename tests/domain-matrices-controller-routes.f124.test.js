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
  'F124-HTTP-001 controller crea matriz',
  () => {
    assert.match(
      controllerSource,
      /async\s+createMatrix\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.createMatrix/
    );
  }
);


test(
  'F124-HTTP-002 controller actualiza matriz',
  () => {
    assert.match(
      controllerSource,
      /async\s+updateMatrix\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.updateMatrix/
    );
  }
);


test(
  'F124-HTTP-003 controller cambia estado',
  () => {
    assert.match(
      controllerSource,
      /async\s+setMatrixActive\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.setMatrixActive/
    );
  }
);


test(
  'F124-HTTP-004 POST matrices soportado',
  () => {
    assert.match(
      routesSource,
      /ruta\s*===\s*['"]\/api\/domain\/matrices['"][\s\S]*metodo\s*===\s*['"]POST['"]/
    );
  }
);


test(
  'F124-HTTP-005 PUT matriz usa id dinámico',
  () => {
    assert.match(
      routesSource,
      /api\\\/domain\\\/matrices\\\/\(\\d\+\)/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PUT['"]/
    );
  }
);


test(
  'F124-HTTP-006 PATCH estado matriz soportado',
  () => {
    assert.match(
      routesSource,
      /matrices\\\/\(\\d\+\)\\\/estado/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PATCH['"]/
    );
  }
);


test(
  'F124-HTTP-007 no introduce DELETE físico',
  () => {
    assert.doesNotMatch(
      routesSource,
      /metodo\s*===\s*['"]DELETE['"][\s\S]*matrices/
    );
  }
);