[![CircleCI](https://circleci.com/gh/bbeesley/aws-blue-green-toolkit/tree/master.svg?style=svg)](https://circleci.com/gh/bbeesley/aws-blue-green-toolkit/tree/master) [![codecov](https://codecov.io/gh/bbeesley/aws-blue-green-toolkit/branch/master/graph/badge.svg)](https://codecov.io/gh/bbeesley/aws-blue-green-toolkit) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

# aws-blue-green-toolkit

Utility functions to help with performing blue/green and canary deployments in AWS infrastructure

## background

AWS support for blue/green and canary deployments is provided by CodeDeploy. CodeDeploy is great in what it does, but it only really manages swapping versions for web services. Any services that sit behind the public facing API don't get managed by the CodeDeploy flow.

A common pattern for blue/green and canary deployments is to not just use a pair of services for the web component, but use a pair of services for the whole pipeline, eg data ingestion, databases, queues, data manipulation lambdas etc. You can manage starting, hydrating, and using these services as part of the CodeDeploy pipeline through the use of hooks (in the form of lambdas). Using these hook lambdas you can manage blue/green or canary deployments of a whole stack of services using the aws-sdk, unfortunately this normally means writing a lot of code to manage the process.

This module is a set of utility functions that I use to reduce the boilerplate required to set up these deploment hook lambdas.

## example architecture

For an example web api, using a node application in docker, with a SQL data store, and data updates being published on an SNS topic, the architecture may looks something like this:
![](docs/SimplifiedArchitecture.png)

In order to manage blue/green deployments for this service, CodeDeploy will directly handle deploying the new ECS service, attaching target groups to load balancers, flipping traffic over to the new service, and tearing down the old containers.

Unfortunately this really only covers less than half of the architecture. Everything from the data updates topic through to the database is up to you to manage through hooks. When deploying a new version of the service, the steps required will be something like this:

1.  Replacement database cluster is started or created
2.  Autoscaling minimum capacity on the new db cluster is set to match the current capacity of the active cluster
3.  Replacement database is purged and the latest schema is created
4.  SNS subscriptions are enabled for the replacement queue
5.  SQS subscription lambda is enabled for the replacement stack
6.  A new task set is created in the ECS service, it is bound to the replacement stack's database
7.  The new task set is placed in a testing target group, this is attached to a testing port on the load balancer
8.  Automated tests are carried out against the replacement service via the testing port
9.  The replacement stack becomes the active stack, what was the active stack is now the old stack.
10. Autoscaling minimum capacity on the active set is reverted to the normal value, database will scale in when traffic is lower.
11. SNS subscriptions are disabled for the old stack
12. SQS subscription for the old stack's ingest queue is disabled
13. Old database cluster is stopped or deleted
14. The old SQS queues are purged
15. The old ECS taskset is destroyed

CodeDeploy will carry out steps 6, 7, 9, and 15. This module contains tools to help you perform the other steps from your deployment hook lambda functions.

## api

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

-   [AuroraConfig](#auroraconfig)
-   [AuroraTools](#auroratools)
    -   [getClusterState](#getclusterstate)
        -   [Parameters](#parameters)
    -   [scaleIn](#scalein)
        -   [Parameters](#parameters-1)
    -   [scaleOut](#scaleout)
        -   [Parameters](#parameters-2)
    -   [getReaderCount](#getreadercount)
        -   [Parameters](#parameters-3)
    -   [startDatabase](#startdatabase)
        -   [Parameters](#parameters-4)
    -   [stopDatabase](#stopdatabase)
        -   [Parameters](#parameters-5)
    -   [deleteDatabase](#deletedatabase)
        -   [Parameters](#parameters-6)
    -   [applyTags](#applytags)
        -   [Parameters](#parameters-7)
-   [AwsConfig](#awsconfig)
-   [ClusterState](#clusterstate)
-   [StackReference](#stackreference)
-   [LambdaConfig](#lambdaconfig)
-   [LambdaTools](#lambdatools)
    -   [enableRule](#enablerule)
        -   [Parameters](#parameters-8)
    -   [disableRule](#disablerule)
        -   [Parameters](#parameters-9)
    -   [enableEventMapping](#enableeventmapping)
        -   [Parameters](#parameters-10)
    -   [disableEventMapping](#disableeventmapping)
        -   [Parameters](#parameters-11)
-   [TopicData](#topicdata)
-   [SnsConfig](#snsconfig)
-   [SnsTools](#snstools)
    -   [enableSubscription](#enablesubscription)
        -   [Parameters](#parameters-12)
    -   [disableSubscription](#disablesubscription)
        -   [Parameters](#parameters-13)
-   [SqsConfig](#sqsconfig)
-   [SqsTools](#sqstools)
    -   [purgeQueues](#purgequeues)
        -   [Parameters](#parameters-14)

### AuroraConfig

[src/main/AuroraTools.ts:13-18](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L13-L18 "Source code on GitHub")

**Extends AwsConfig**

Configuration options for the Aurora toolkit

### AuroraTools

[src/main/AuroraTools.ts:25-258](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L25-L258 "Source code on GitHub")

Toolkit for Aurora operations

#### getClusterState

[src/main/AuroraTools.ts:63-80](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L63-L80 "Source code on GitHub")

Gets the current state of one of the Aurora clusters

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[ClusterState](#clusterstate)>** 

#### scaleIn

[src/main/AuroraTools.ts:118-120](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L118-L120 "Source code on GitHub")

Reverts a cluster's minimum reader count to the configured minimum

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### scaleOut

[src/main/AuroraTools.ts:128-133](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L128-L133 "Source code on GitHub")

Scales out a cluster to match it's partner's size

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### getReaderCount

[src/main/AuroraTools.ts:141-155](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L141-L155 "Source code on GitHub")

Get a count of the number of active readers for a cluster

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)>** The number of active readers

#### startDatabase

[src/main/AuroraTools.ts:163-166](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L163-L166 "Source code on GitHub")

Starts a stopped db cluster

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### stopDatabase

[src/main/AuroraTools.ts:174-177](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L174-L177 "Source code on GitHub")

Stops a running db cluster

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### deleteDatabase

[src/main/AuroraTools.ts:185-217](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L185-L217 "Source code on GitHub")

Deletes a running db cluster

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a db cluster

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### applyTags

[src/main/AuroraTools.ts:226-257](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/AuroraTools.ts#L226-L257 "Source code on GitHub")

Parses a message from an rds event subscription, if the event was triggered by a scale out
operation, the tags defined in config are applied to the newly created reader.

##### Parameters

-   `record` **SNSEventRecord** An SNS event record of the type published by rds event streams

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

### AwsConfig

[src/main/common-interfaces.ts:6-12](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/common-interfaces.ts#L6-L12 "Source code on GitHub")

Base config used in all tool kits

### ClusterState

[src/main/constants.ts:6-11](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/constants.ts#L6-L11 "Source code on GitHub")

Enum for describing the state of an RDS cluster

Type: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)

### StackReference

[src/main/constants.ts:18-21](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/constants.ts#L18-L21 "Source code on GitHub")

Enum for referencing blue or green stacks

Type: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)

### LambdaConfig

[src/main/LambdaTools.ts:12-15](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/LambdaTools.ts#L12-L15 "Source code on GitHub")

**Extends AwsConfig**

Configuration options for the Lambda toolkit

### LambdaTools

[src/main/LambdaTools.ts:27-136](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/LambdaTools.ts#L27-L136 "Source code on GitHub")

Toolkit for Lambda operations

#### enableRule

[src/main/LambdaTools.ts:79-81](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/LambdaTools.ts#L79-L81 "Source code on GitHub")

Enables a lambda's cloudwatch events rule (ie, cron trigger)

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a lambda stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### disableRule

[src/main/LambdaTools.ts:89-91](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/LambdaTools.ts#L89-L91 "Source code on GitHub")

Disables a lambda's cloudwatch events rule (ie, cron trigger)

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a lambda stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### enableEventMapping

[src/main/LambdaTools.ts:123-125](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/LambdaTools.ts#L123-L125 "Source code on GitHub")

Enables a lambda's event mappings (eg, an SQS subscription)

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a lambda stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### disableEventMapping

[src/main/LambdaTools.ts:133-135](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/LambdaTools.ts#L133-L135 "Source code on GitHub")

Disables a lambda's event mappings (eg, an SQS subscription)

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a lambda stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

### TopicData

[src/main/SnsTools.ts:11-17](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SnsTools.ts#L11-L17 "Source code on GitHub")

Parameters to describe an SNS topic subscription

### SnsConfig

[src/main/SnsTools.ts:30-33](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SnsTools.ts#L30-L33 "Source code on GitHub")

**Extends AwsConfig**

Configuration options for the SNS toolkit

### SnsTools

[src/main/SnsTools.ts:60-118](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SnsTools.ts#L60-L118 "Source code on GitHub")

Toolkit for SNS operations

#### enableSubscription

[src/main/SnsTools.ts:105-107](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SnsTools.ts#L105-L107 "Source code on GitHub")

Enables an SNS subscription

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a subscription queue stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

#### disableSubscription

[src/main/SnsTools.ts:115-117](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SnsTools.ts#L115-L117 "Source code on GitHub")

Disables an SNS subscription

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a subscription queue stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 

### SqsConfig

[src/main/SqsTools.ts:12-15](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SqsTools.ts#L12-L15 "Source code on GitHub")

**Extends AwsConfig**

Configuration options for the SQS toolkit

### SqsTools

[src/main/SqsTools.ts:27-65](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SqsTools.ts#L27-L65 "Source code on GitHub")

Toolkit for SQS operations

#### purgeQueues

[src/main/SqsTools.ts:51-64](https://github.com/bbeesley/aws-blue-green-toolkit/blob/f88d43c0c9c5f918d0f8379bbe621a1ad68ce3e1/src/main/SqsTools.ts#L51-L64 "Source code on GitHub")

Purges a queue pair (q and dlq) based on config and queue reference

##### Parameters

-   `reference` **[StackReference](#stackreference)** Reference to a subscription queue stack

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>** 
