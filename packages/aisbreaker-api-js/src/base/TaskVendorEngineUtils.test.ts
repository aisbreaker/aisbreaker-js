import { getTaskVendorEngineFromServiceId } from './TaskVendorEngineUtils.js';

/**
 * Unit tests for TaskVendorEngineUtils
 * 
 * @group unit
 */
describe('getTaskVendorEngineFromServiceId', () => {
  const defaults = { task: 'defaultTask', vendor: 'defaultVendor', engine: 'defaultEngine' };

  it('returns defaults when serviceId is undefined', () => {
    const result = getTaskVendorEngineFromServiceId(undefined, defaults);
    expect(result).toEqual(defaults);
  });

  it('returns defaults when serviceId is an empty string', () => {
    const result = getTaskVendorEngineFromServiceId('', defaults);
    expect(result).toEqual(defaults);
  });

  it('extracts task, vendor, and engine from serviceId', () => {
    const serviceId = 'myTask:myVendor/myEngine';
    const result = getTaskVendorEngineFromServiceId(serviceId, defaults);
    expect(result).toEqual({ task: 'myTask', vendor: 'myVendor', engine: 'myEngine' });
  });

  it('extracts task, vendor, and 2 engine parts from serviceId', () => {
    const serviceId = 'myTask:myVendor/myEnginePart1/myEnginePart2';
    const result = getTaskVendorEngineFromServiceId(serviceId, defaults);
    expect(result).toEqual({ task: 'myTask', vendor: 'myVendor', engine: 'myEnginePart1/myEnginePart2' });
  });

  it('extracts task, vendor, and 4 engine parts from serviceId', () => {
    const serviceId = 'myTask:myVendor/myEnginePart1/myEnginePart2/myEnginePart3a:myEnginePart3b';
    const result = getTaskVendorEngineFromServiceId(serviceId, defaults);
    expect(result).toEqual({ task: 'myTask', vendor: 'myVendor', engine: 'myEnginePart1/myEnginePart2/myEnginePart3a:myEnginePart3b' });
  });


  it('extracts only task from serviceId', () => {
    const serviceId = 'myTask:';
    const result = getTaskVendorEngineFromServiceId(serviceId, defaults);
    expect(result).toEqual({ task: 'myTask', vendor: 'defaultVendor', engine: 'defaultEngine' });
  });


  it('returns defaults when vendor and engine are not specified in serviceId', () => {
    const serviceId = 'myTask:';
    const result = getTaskVendorEngineFromServiceId(serviceId, defaults);
    expect(result).toEqual({ task: 'myTask', vendor: 'defaultVendor', engine: 'defaultEngine' });
  });
});