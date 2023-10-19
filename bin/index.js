#!/usr/bin/env node

"use strict";
const path = require("path");
const fs = require('fs-extra');
const chalk = require("chalk");
const process = require("process");
const commander = require("commander");
const pkgInfo = require("../package.json");
const { currentWorkingDirectory, argv, handleAndExitOnError } = require("node-wiz");
const os = require("os");

commander.version(pkgInfo.version);

commander
  .command("init [destinationPath]")
  .option("--type [destinationPath]", "Specify the template path")
  .description("Create tempate.")
  .action((destinationPath = "scripts/api.js") => {
    handleAndExitOnError(() => {
      const targetPath = path.join(currentWorkingDirectory, destinationPath);
      if (fs.existsSync(targetPath)) {
        console.error(chalk.red(`file '${destinationPath}' already exists in your app folder. We cannot continue as you would lose all the changes in that file or directory. Please move or delete it (maybe make a copy for backup) and run this command again.`));
        process.exit(1);
      }
      const sourcePath = path.resolve(__dirname, "./template.js");
      const source = fs.readFileSync(sourcePath).toString()
      fs.ensureFileSync(targetPath);
      fs.writeFileSync(targetPath, source);

      console.info(`Adding ${chalk.cyan(targetPath)} to the project`);

      const appPackage = require(path.join(currentWorkingDirectory, "package.json"));

      if(appPackage.scripts["api"]) { 
        console.warn(chalk.yellow("The 'api' script already exists in your package.json. Please add it manually."));
      } else {
        appPackage.scripts["api"] = `node ${destinationPath}`;
        fs.writeFileSync(path.join(currentWorkingDirectory, "package.json"), JSON.stringify(appPackage, null, 2) + os.EOL);
      }

      const cookiePath = path.join(currentWorkingDirectory, ".cookie");
      if(!fs.existsSync(cookiePath)) {
        fs.writeFileSync(cookiePath, "");
        console.info(`Adding ${chalk.cyan(cookiePath)} to the project`);

      }
    })
  });

commander.parse(argv);
