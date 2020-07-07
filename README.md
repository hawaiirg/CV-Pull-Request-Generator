# CV Pull Request Generator

Utility to generate GitHub pull requests for each of the CV-related repositories to merge the `dev` branches into
the `test` branches. The act of merging into the `test` branch triggers deployment builds to the CV test environment.

Creating GitHub pull requests for these merges have the following benefits:
* Merges are done at the source, by GitHub, so they're let prone to error
* Merging pull requests are a single-click operation via the GitHub web UI
* Pull requests can be done up-front, then updated with subsequent commits, and merged when everything is ready

## Prerequisites
You can use one of the pre-built binaries for various platforms included in the releases, or you can download and run
from source. If you want to run from source, you'll need the following tools:
* NodeJS (>= v10)

## Operation
Run the following command from the prompt:
```
> cv-pull-request [options]
```

See the Options section below for details.

### Options
Note: If the 'REQUIRED' options are not supplied, the application will ask for the values at runtime
```
    --version, -v      [REQUIRED] CV release version
    --assignees, -a    [REQUIRED] Assignees (comma-separated list)
    --token, -t        [REQUIRED] GitHub API token
    --automatic, -y    [OPTIONAL] Automatic mode; disable interactive prompts. This mode will raise errors if all
                                  required fields are not present
    --configFile, -c   [OPTIONAL] YAML configuration file (default: './cv-pull-request.yaml')
    --saveConfig, -s   [OPTIONAL] Save the configuration values to the specified config file (default: true)
    --debug, -d        [OPTIONAL] Run in debug mode if present (default: false)
    --help, -h         Show this message
```

### OS X Security Issue
If you get a security warning, 

Open "Security and Privacy" in OS X System Preferences, select "Allow Untrusted App" then "Run". You only need to do this once.
