import { DummyAssistantFactory } from "../services/index.js"
import { AIsBreaker } from "./AIsBreaker.js"
import { AIsError } from "./AIsError.js"

/**
 * Unit tests for AIsBreaker.getFactory()
 * 
 * @group unit
 */
describe("AIsBreaker", () => {
  describe("getFactory", () => {
    // setup/preparation
    const aisBreaker = new AIsBreaker()
    const ab = aisBreaker
    class FactoryTest extends DummyAssistantFactory {}
    class FactoryTestExampleCom extends DummyAssistantFactory {}
    class FactoryTestExampleComMyModel extends DummyAssistantFactory {}
    class FactoryTestExampleComOtherModel extends DummyAssistantFactory {}
    class FactoryTestBeispielDe extends DummyAssistantFactory {}
    aisBreaker.registerFactory({ serviceId: "test:", factory: new FactoryTest() })
    aisBreaker.registerFactory({ serviceId: "test:example.com", factory: new FactoryTestExampleCom() })
    aisBreaker.registerFactory({ serviceId: "test:example.com/my/model", factory: new FactoryTestExampleComMyModel() })
    aisBreaker.registerFactory({ serviceId: "test:example.com/other/model", factory: new FactoryTestExampleComOtherModel() })
    aisBreaker.registerFactory({ serviceId: "test:beispiel.de", factory: new FactoryTestBeispielDe() })

    it("returns the correct factory when given a valid serviceId", () => {
      expect (ab.getFactory({ serviceId: "test:" })).       toBeInstanceOf(FactoryTest)
      //expect (ab.getFactory({ serviceId: "test:unknown" })).toBeInstanceOf(FactoryTest)
      expect (ab.getFactory({ serviceId: "test:example.com" })).      toBeInstanceOf(FactoryTestExampleCom)
      expect (ab.getFactory({ serviceId: "test:example.com/my" })).   toBeInstanceOf(FactoryTestExampleCom)
      expect (ab.getFactory({ serviceId: "test:example.com/my/model" })).     toBeInstanceOf(FactoryTestExampleComMyModel)
      expect (ab.getFactory({ serviceId: "test:example.com/my/model/plus" })).toBeInstanceOf(FactoryTestExampleComMyModel)
      expect (ab.getFactory({ serviceId: "test:example.com/other" })).toBeInstanceOf(FactoryTestExampleCom)
      expect (ab.getFactory({ serviceId: "test:example.com/other/model" })).     toBeInstanceOf(FactoryTestExampleComOtherModel)
      expect (ab.getFactory({ serviceId: "test:example.com/other/model/plus" })).toBeInstanceOf(FactoryTestExampleComOtherModel)
      expect (ab.getFactory({ serviceId: "test:beispiel.de" })).toBeInstanceOf(FactoryTestBeispielDe)
    })

    it("throws an AIsError with status code 404 when given an invalid serviceId (1)", () => {
      expect(() => ab.getFactory({ serviceId: "invalid:" })).toThrowError(AIsError)
      expect(() => ab.getFactory({ serviceId: "invalid:" })).toThrowError("No factory registered for serviceId 'invalid:'")
      //expect(() => ab.getFactory({ serviceId: "invalid:" })).toThrowErrorMatchingSnapshot()
    })

    it("throws an AIsError with status code 404 when given an invalid serviceId (2)", () => {
      expect(() => ab.getFactory({ serviceId: "test:invalid" })).toThrowError(AIsError)
      expect(() => ab.getFactory({ serviceId: "test:invalid" })).toThrowError("No factory registered for serviceId 'test:invalid'")
      //expect(() => ab.getFactory({ serviceId: "test:invalid" })).toThrowErrorMatchingSnapshot()
    })
  })
})
