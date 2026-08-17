#!/usr/bin/env node
process.stderr.write(
  "Production deployment is locked during recovery. A protected, independently approved deployment workflow has not been implemented.\n",
);
process.exit(1);
