OpenAPI Spec of aisbreaker-api
==============================

Introduction
------------
We maintain an [OpenAPI](https://www.openapis.org/) spec of our `aisbreaker` API.

This spec allows us the generation of classes for the API in diferent programming languages.
Currently, we start with TypeScript (incl. JavaScript), but later other languages will follow.
The classes/data structures of the APIs in these different languages will then be exactly the same.

In the future we maybe also implement an actually REST service and REST clients (what OpenAPI is mainly intended for),
but this is not decided yet.


Convert OpenAPI Spec to TypeScript Classes
------------------------------------------
Generating the TypeScript classes is a manual task that should be executed once after an update of the OpenAPI spec in `aisbreaker-api/openapi-spec/`.

The classes will be saved in `aisbreaker-api/src/api/generated/` and committed to the git.

Steps:
* Ensure the precondition: Java (and npm of course) must be installed:

      # Java is needed
      # install e.g. with:
      sudo apt install openjdk-17-jdk-headless

* generate the TypeScript classes:

      cd aisbreaker-api/openapi-spec/
      ./generate-aisbreaker-api-typescript.sh

* commit the results in `aisbreaker-api/src/api/generated/` to git


Spec Details
------------
_Continue reading only if your are really interested in the details._

To proberly model inheritance/polimorphism of classes, we use `allOf` and `discriminator` fields.
See [OpenAPI 3.0.0: Models with Polymorphism Support](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#models-with-polymorphism-support) for details.


Tool Details
------------
_Continue reading only if your are really interested in the details._

To convert the OpenAPI spec to TypeScript classes we use:
* https://github.com/drwpow/openapi-typescript
    * https://www.npmjs.com/package/openapi-typescript

Command (just for testing the tool):

    # Java is needed
    # install e.g. with:
    sudo apt install openjdk-17-jdk-headless

    # action
    npx openapi-generator-cli generate -i ./foo-openapi-spec.yml -g typescript -o ./generated-files/

Pros:
* model classes in `generated-files/models/`
* snake_case was not converted to CamelCase

Cons:
* unneeded `import { HttpFile } from '../http/http';` was generated
    * solution:
        * create such a module `http`, but empty/without functionality

