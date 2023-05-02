<p>
  <a href="https://www.npmjs.com/package/confignition" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/confignition.svg">
  </a>
  <a href="https://github.com/AndreaPallotta/confignition#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/AndreaPallotta/confignition/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/AndreaPallotta/confignition/blob/master/LICENSE.md" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/github/license/AndreaPallotta/confignition" />
  </a>
  <a href="https://github.com/AndreaPallotta/confignition/issues" target="_blank">
    <img alt="Issues" src="https://img.shields.io/github/issues/AndreaPallotta/confignition" />
  </a>
  <img alt="downloads" src="https://img.shields.io/npm/dt/confignition" />
  <img alt="stars" src="https://img.shields.io/github/stars/AndreaPallotta/confignition" />
</p>

<div style="display: flex; justify-content: center;">
  <h1>Confignition</h1>
  <img alt="Logo" src="logo.svg" style="width: 75px; height: auto; margin-left: 1rem;" />
</div>

This TypeScript library provides a simple and efficient way to parse different types of config files, including JSON, YAML, INI, .env, and TOML.
Additionally, it supports retrieving files stored on AWS S3 or Azure Blob.

---

## Supported File Types

The library current supports the following file types:

- **JSON**
- **YAML**
- **INI**
- **.env**
- **TOML**

---

## Installation

To install the package you can use npm or yarn:

```bash
npm install confignition
```

or

```bash
yarn add confignition
```

---

## Usage

To use this library, first import it (supports both ES5 and ES6+):

```js
const { parse, getConfig } = require('confignition');
```

or

```js
import { parse, getConfig } from 'confignition';
```

---

## Examples

- For the following example config:

  ```toml
  [server]
  host = "localhost"
  port = 5000

  [database]
  url = "postgres://username:password@localhost/mydatabase"


  [[database.options]]
  https = true
  auth = "basic"
  ```

- Parse a local file

  ```js
  const config = parse('src/configs/config.toml');

  /**
   {
    port: 5000,
    host: 'localhost',
   }
   */
  ```

  > NOTE: you can also specify the file type if the extension does not match the file format

  ```js
  const config = parse('src/configs/config.txt', { type: 'toml' });
  ```

- Retrieve the parsed configurationn object

  ```js
  const config = getConfig();

  /**
   {
    port: 5000,
    host: 'localhost',
   }
   */
  ```

- Update configuration file

  ```js
  const updatedConfig = update({ newConfig: 'updated' });
  ```

---

## Parse Configuration

To parse the configuration, you can use the `parse` function. The function accepts 2 arguments:

- The file path - relative to the root directory of the project
- An object to specify options (optional)

```js
// The type is inferred
import { parse } from 'confignition';
const config = parse('src/configs/.env');

// or

// The type must be specified because the file extension does not match the format type
const config = parse('src/config/config.txt', { type: 'dotenv' });
```

---

## Custom Parsing

In additional to the parsing algorithms provided, you can write your own. Especially useful if the config format is not currently supported or requires extra steps.

```js
import { customParse } from 'confignition';

const config = customParse('src/config/config.cfg', 'cfg', (content) => {
  let conf;
  // ...parsing logic
  return conf;
});
```

> NOTE: Currently, all options available for the default config (hot reload, remote config) are not available for the custom parsing.

---

## Include Environment Variables

If there are environment variables not included in the configuration file, you can use the `fromEnv` option.
It accepts either a boolean (to load ALL environment variables) or an array (case-sensitive) to specify which environment variables to load.

```js
const config = parse('src/config/config.yaml', { fromEnv: true }); // load all variables

const config = parse('src/config/config.toml', { fromEnv: ['NODE_ENV'] }); // only load specific fields (case-sensitive)
```

---

## Update Config File

To update the existing configuration or create a new file and subscribe to it, you can use the `update` function. The function accepts 2 arguments:

- The new configuration object or a callback similar to React's useState hook.

```js
// Override configuration
const updatedConfig = update({ override: true });

// or

// Add additional fields to existing configuration
const updatedConfig = update((prev) => ({
  ...prev,
  additionalSection: {
    updatedConfig: true,
  },
}));

// Create a new configuration file and subscribe to it
const updateConfig = update(
  { newConfig: true, version: '0.2.0' },
  {
    createNewFile: true,
    newFileOptions: {
      path: 'src/configs/newConfig.json', // if the file already exists, it will override its content.
      type: 'json', // optional. Type will be inferred from the file name
    },
  }
);
```

---

## Load Remote Configurations

Currently, the library supports retrieving files from AWS S3 Buckets and Azure Blob Storages. Pass the remote file name as the file path and add the configurations needed to access the remote storage.

- AWS:

```js
const config = parse('config_on_aws', {
  type: 'json',
  fromCloud: true,
  cloudConfig: {
    aws: {
      s3Bucket: 'my-bucket',
      awsConfig: {
        /* aws configs */
      },
      // refer to the AWS SDK Docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html
    },
  },
});
```

- Azure:

```js
const config = parse('config_on_azure', {
  type: 'ini',
  fromCloud: true,
  cloudConfig: {
    azure: {
      connectionString: 'my-bucket',
      containerName: 'my-container',
      // refer to the Azure SDK Docs: https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/blobserviceclient?view=azure-node-latest#@azure-storage-blob-blobserviceclient-constructor-1
    },
  },
});
```

---

## Hot Reload

The library supports hot reloading of the config file. Set the `hotReload` to `true`

```js
const config = parse('../config.toml', {
  hotReload: true,
  hotReloadInterval: 2000, // in ms. Default: 1000ms
});
```

> NOTE: Hot reload only works for local files. Changes to remote files will not trigger an update.

---

## Express Integration

A middleware is available for integration with the Express framework. The middleware injects the existing configuration or parsed a new one (if the filepath is specified) into the request object.

```js
import * as express from 'express';
import { expressConfignition } from 'confignition';
const app = express();

app.use(expressConfignition('src/configs/config.ini'));

app.get('/', (req, res) => {
  const { config, params } = req;
  // ...
});
```

or

```js
import * as express from 'express';
import { parse, expressConfignition } from 'confignition';

parse('src/configs/config.yaml');

const app = express();

app.use(expressConfignition());

app.get('/', (req, res) => {
  const { config, params } = req;
  // the rest of the request.
});
```

---

## Encryption (Coming Soon)

In a future release, the library will support encryption of the config files (or part of them). This will allow you to store sensitive information such as API keys, passwords, and tokens securely.

---

## Author

👤 **Andrea Pallotta**

- Github: [@AndreaPallotta](https://github.com/AndreaPallotta)

> For inquiries, suggestions, and criticisms, you can reach me via:
>
> - email: [andreapallotta.dev@gmail.com](mailto:andreapallotta.dev@gmail.com)
> - LinkedIn: [@andreapallotta9](https://linkedin.com/in/andreapallotta9)

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/AndreaPallotta/confignition/issues).

If you have your own template repository, I suggest to clone this tool and change the source repository!

---

## Show your support

Give a ⭐️ if you found this tool useful or interesting!

---

## 📝 License

This project is [MIT](https://github.com/AndreaPallotta/confignition/blob/master/LICENSE) licensed.
