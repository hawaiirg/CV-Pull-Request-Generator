'use strict';

const prompts = require('prompts');
const fs = require('fs-extra');
const chalk = require('chalk');
const meow = require('meow');
const yaml = require('js-yaml');
const { format } = require('date-fns');

const DEFAULT_CONFIG_FILE = './cv-pull-request.yaml';

const DEPLOY_TYPE_VALUES = {
    test: {
        source: 'dev',
        target: 'test',
    },
    prod: {
        source: 'test',
        target: 'prod',
    }
};
const DEPLOY_TYPE_DEFAULT = 'test';

const DEPLOY_TYPE_CHOICES = [
    { title: 'Test', description: 'Test deployment (dev -> test)', value: 'test' },
    { title: 'Production', description: 'Production deployment (test -> prod)', value: 'prod' },
];

const FLAGS = {
    version: { type: 'string', alias: 'v', required: true },
    assignees: { type: 'string', alias: 'a', required: true },
    token: { type: 'string', alias: 't', required: true },
    deployType: { type: 'string', alias: 'b', required: true },
    automatic: { type: 'boolean', alias: 'y', default: false },
    configFile: { type: 'string', alias: 'c', default: DEFAULT_CONFIG_FILE },
    saveConfig: { type: 'boolean', alias: 's', default: true },
    debug: { type: 'boolean', alias: 'd', default: false },
    help: { type: 'boolean', alias: 'h', default: false },
};

const REQUIRED_FIELDS = Object.keys(FLAGS).filter(key => FLAGS[key].required);

const cli = meow(`
    Usage
        cv-pull-request [options]

    Note: If the 'REQUIRED' options are not supplied, the application will ask for the values at runtime

    Options
        --version, -v      [REQUIRED] CV release version
        --assignees, -a    [REQUIRED] Assignees (comma-separated list)
        --token, -t        [REQUIRED] GitHub API token
        --deployType, -b   [REQUIRED] Type of deploy being done, can be either "test" or "prod"
        --automatic, -y    [OPTIONAL] Automatic mode; disable interactive prompts. This mode will raise errors if all
                                      required fields are not present
        --configFile, -c   [OPTIONAL] YAML configuration file (default: '${DEFAULT_CONFIG_FILE}')
        --saveConfig, -s   [OPTIONAL] Save the configuration values to the specified config file (default: true)
        --debug, -d        [OPTIONAL] Run in debug mode if present (default: false)
        --help, -h         Show this message
`, { flags: FLAGS });

const { flags: props } = cli;
const { assignees } = props;
props.assignees = (typeof assignees === 'string') ? assignees.split(',') : assignees;

const DEFAULT_PROJECT_CONFIG = [{
    name: 'JLV - CCP',
    repo: 'JLV',
    head: 'cvccp_{source}_{version}',
    base: 'cvccp_{target}_{version}',
}, {
    name: 'JLV - VAS',
    repo: 'JLV',
    head: 'cvvas_{source}_{version}',
    base: 'cvvas_{target}_{version}',
}, {
    name: 'JMeadows - CCP',
    repo: 'jMeadows',
    head: 'cvccp_{source}_{version}',
    base: 'cvccp_{target}_{version}',
}, {
    name: 'JMeadows - VAS',
    repo: 'jMeadows',
    head: 'cvvas_{source}_{version}',
    base: 'cvvas_{target}_{version}',
}, {
    name: 'HuiCore',
    repo: 'HuiCore',
    head: 'cv_{source}_{version}',
    base: 'cv_{target}_{version}',
}, {
    name: 'VistA Data Service',
    repo: 'VistaDataService',
    head: 'cv_{source}_{version}',
    base: 'cv_{target}_{version}',
}, {
    name: 'JLV QoS',
    repo: 'jlvqos',
    head: 'cv_{source}_{version}',
    base: 'cv_{target}_{version}',
}, {
    name: 'Report Builder',
    repo: 'ReportBuilder',
    head: 'cv_{source}_{version}',
    base: 'cv_{target}_{version}',
}];

const DEFAULT_CONFIG = {
    version: '',
    owner: 'HRG-Technologies-LLC',
    userAgent: 'HRG GitHub Utilities',
    timezone: 'Pacific/Honolulu',
    token: '',
    projects: DEFAULT_PROJECT_CONFIG,
};

const readOptionFile = () => {
    const fileString = chalk.white.bold(props.configFile);
    console.log(`Reading config file ${fileString}...`);
    try {
        const options = yaml.safeLoad(fs.readFileSync(props.configFile));
        return options;
    } catch (err) {
        console.log(chalk.yellow(`Couldn't load file ${fileString}, using default values...`));
        return {};
    }
};

const writeOptionFile = (options = {}) => {
    const fileString = chalk.white.bold(props.configFile);
    const { date, debug, ...targetOptions } = options;
    console.log(`Writing config file ${fileString}...`);
    try {
        fs.writeFileSync(props.configFile, yaml.safeDump(targetOptions));
    } catch (err) {
        const errorString = chalk.red(err.toString());
        console.log(`Couldn't save file ${chalk.yellow(props.configFile)} ${errorString}`);
    }
};

const getOptions = () => Object.assign({
    date: format(new Date(), 'MM-dd-yyyy'),
}, DEFAULT_CONFIG, readOptionFile());


const getDeployTypeIndex = (deployType) => {
    if (!deployType) {
        return 0;
    }

    const choiceIndex = DEPLOY_TYPE_CHOICES.findIndex((choice) => choice.value === deployType);
    return (choiceIndex >= 0 ? choiceIndex : 0);
}

const setDeployTypeOptions = (config) => {
    const { deployType: type = DEPLOY_TYPE_DEFAULT } = config;
    const deployTypeValues = DEPLOY_TYPE_VALUES[type] || DEPLOY_TYPE_VALUES[DEPLOY_TYPE_DEFAULT];

    return Object.assign(config, deployTypeValues);
}

const onCancel = () => {
    process.exit(0);
};

// ======================================================== API ========================================================
const getConfig = async () => {
    const options = getOptions();
    Object.assign(options, { automatic: props.automatic });

    if (props.automatic) {
        Object.assign(options, props);
        const missingFields = REQUIRED_FIELDS.filter(fieldName => !options[fieldName]);
        if (missingFields.length > 0) {
            const missingFieldsStr = chalk.red(missingFields.join(', '));
            console.log(chalk.red.bold(`Missing required fields: ${missingFieldsStr}`));
            console.log(cli.help);
            process.exit(1);
        }
        return options;
    }

    const questions = [{
        type: 'text',
        name: 'version',
        initial: options.version || '',
        message: 'What CV version are you building?',
        validate: value => (value ? true : 'Please enter a version'),
    }, {
        type: 'select',
        name: 'deployType',
        initial: getDeployTypeIndex(options.deployType),
        message: 'What kind of deployment are you doing?',
        choices: DEPLOY_TYPE_CHOICES,
    }, {
        type: 'list',
        name: 'assignees',
        initial: Array.isArray(options.assignees) ? options.assignees.join(',') : '',
        message: 'Who are the issue assignees? (separate multiple assignees with a comma)',
        validate: value => (value.length > 0 ? true : 'Please enter at least one assignee'),
    }, {
        type: 'text',
        name: 'token',
        initial: options.token || '',
        message: 'What GitHub API token should we use?',
        validate: value => (value ? true : 'Please enter a GitHub API token'),
    }];

    prompts.override(props);
    const config = await prompts(questions, { onCancel });
    return Object.assign(options, setDeployTypeOptions(config));
};

const saveConfig = (config) => {
    if (props.saveConfig) {
        writeOptionFile(config);
    }
};

module.exports = {
    getConfig,
    saveConfig,
    version: cli.pkg.version,
};
