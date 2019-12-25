import { LambdaTools, StackReference } from '../main';
import * as AWS from 'aws-sdk';

const lambdaTools = new LambdaTools({
  awsRegion: 'eu-central-1',
  awsProfile: '555',
  environment: 'dev',
  namespace: 'fn',
  tags: {},
  lambdaNameA: 'fn-a-dev',
  lambdaNameB: 'fn-b-dev',
});

describe('LambdaTools', () => {
  describe('enableEventMapping', () => {
    it('calls updateEventSourceMapping with expected params', async () => {
      await lambdaTools.enableEventMapping(StackReference.b);
      expect(AWS.Lambda._updateEventSourceMapping).toHaveBeenCalledWith({
        UUID: 'uuid',
        Enabled: true,
      });
    });
  });
  describe('disableEventMapping', () => {
    it('calls updateEventSourceMapping with expected params', async () => {
      await lambdaTools.disableEventMapping(StackReference.b);
      expect(AWS.Lambda._updateEventSourceMapping).toHaveBeenCalledWith({
        UUID: 'uuid',
        Enabled: false,
      });
    });
  });
  describe('enableRule', () => {
    it('calls enableRule with expected params', async () => {
      await lambdaTools.enableRule(StackReference.b);
      expect(AWS.CloudWatchEvents._enableRule).toHaveBeenCalledWith({
        Name:
          AWS.CloudWatchEvents._eventsResponses.listRuleNamesByTarget
            .RuleNames[0],
      });
    });
  });
  describe('disableRule', () => {
    it('calls disableRule with expected params', async () => {
      await lambdaTools.disableRule(StackReference.b);
      expect(AWS.CloudWatchEvents._disableRule).toHaveBeenCalledWith({
        Name:
          AWS.CloudWatchEvents._eventsResponses.listRuleNamesByTarget
            .RuleNames[0],
      });
    });
  });
});
