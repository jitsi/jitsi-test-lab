# Jitsi Test Lab

Jitsi Test Lab is an application for manual testing and experimentation with Jitsi Meet and Jitsi as a Service (JaaS).

# Development
To run in development mode use `npm run dev`.

# Building

To build a package use `npm run build`.

# Configuration
The aplication comes with a default `config.json` file, which can be used to
provide a configuration preset. **Note that this file is exposed publically 
by design, don't include private information (e.g. keys) unless you intend to
make them available to users of the app**.

Users are also able to configure the environment in their browsers, which
stores the configuration in local storate.

# JaaS configuration
To integrate with JaaS and be able to generate tokens for testing, you'll need
to provive your JaaS tenant (vpaas-magic-cookie-abcd) and private key. **This should
only be used with an account for testing and a separate key**. See the JaaS 
documentation on how to generate and upload a key to your JaaS account.
https://developer.8x8.com/jaas/docs/api-keys-generate-add

## Webhooks
To ingetrage with JaaS webhooks, you'll need to deploy a jaas-test-wh-proxy instance
at a public address, and configure your JaaS account to use it.
https://github.com/jitsi/jaas-test-wh-proxy/
https://developer.8x8.com/jaas/docs/jaas-console-webhooks

In Jitsi Test Lab, you can enter the proxy's WS address and the shared secret. 


