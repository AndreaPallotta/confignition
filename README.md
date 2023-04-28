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

# Confignition

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

---

- Parse a local file

  ```js
  const config = parse('../config.toml');

  /**
   {
    server: {
        port: 5000,
        host: 'localhost',
    },
    database: {
        url: 'postgres://username:password@localhost/mydatabase',
        config: {
            https: true,
            auth: 'basic'
        }
    }
   }
   */
  ```

  > NOTE: you can also specify the file type if the extension does not match the file format

  ```js
  const config = parse('../config.txt', 'toml');
  ```

- Retrieve the parsed configurationn object

  ```js
  const config = getConfig();

  /**
   {
    server: {
        port: 5000,
        host: 'localhost',
    },
    database: {
        url: 'postgres://username:password@localhost/mydatabase',
        config: {
            https: true,
            auth: 'basic'
        }
    }
   }
   */
  ```

---

## Remote Configurations (STILL IN PROGRESS)

Currently, the library supports retrieving files from AWS S3 Buckets and Azure Blob Storages. Pass the remote file name as the file path and add the configurations needed to access the remote storage.

- AWS:

```js
const config = parse('config_on_aws', 'toml', {
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
const config = parse('config_on_azure', 'toml', {
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
const config = parse('../config.toml', 'toml', {
  hotReload: true,
  hotReloadInterval: 2000, // in ms. Default: 1000ms
});
```

> NOTE: Hot reload only works for local files. Changes to remote files will not trigger an update.

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

This is my first npm package and I believe there is still
much to improve.
<br />
Give a ⭐️ if you found this tool useful or interesting!

---

## 📝 License

This project is [MIT](https://github.com/AndreaPallotta/confignition/blob/master/LICENSE) licensed.
