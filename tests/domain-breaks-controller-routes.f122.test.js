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
  'F122-HTTP-001 controller expone creación de quiebre',
  () => {
    assert.match(
      controllerSource,
      /async\s+createBreak\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.createBreak/
    );
  }
);


test(
  'F122-HTTP-002 controller expone actualización',
  () => {
    assert.match(
      controllerSource,
      /async\s+updateBreak\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.updateBreak/
    );
  }
);


test(
  'F122-HTTP-003 controller expone cambio de estado',
  () => {
    assert.match(
      controllerSource,
      /async\s+setBreakActive\s*\(/
    );

    assert.match(
      controllerSource,
      /this\.service\.setBreakActive/
    );
  }
);


test(
  'F122-HTTP-004 POST quiebres está soportado',
  () => {
    assert.match(
      routesSource,
      /ruta\s*===\s*['"]\/api\/domain\/quiebres['"][\s\S]*metodo\s*===\s*['"]POST['"]/
    );
  }
);


test(
  'F122-HTTP-005 PUT quiebres usa id dinámico',
  () => {
    assert.match(
      routesSource,
      /api\\\/domain\\\/quiebres\\\/\(\\d\+\)/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PUT['"]/
    );
  }
);


test(
  'F122-HTTP-006 PATCH estado está soportado',
  () => {
    assert.match(
      routesSource,
      /quiebres\\\/\(\\d\+\)\\\/estado/
    );

    assert.match(
      routesSource,
      /metodo\s*===\s*['"]PATCH['"]/
    );
  }
);


test(
  'F122-HTTP-007 no introduce DELETE físico',
  () => {
    assert.doesNotMatch(
      routesSource,
      /metodo\s*===\s*['"]DELETE['"][\s\S]*quiebres/
    );
  }
);