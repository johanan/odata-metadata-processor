import { buildProperty, buildTypeRoot, findAnyType, findEnumType, findType, flattenTypes } from '../index';

//pulled from jaystack OData library
//ensures compatibility
const schema = require('../schemas/schema_sd_no_enum.json');

describe('Schema JSON Processing', () => {
    it('should not blow up when missing a type', () => {
        const search = findAnyType(schema)
        // first entity
        expect(search(['entityType'])('JayData.Test.CommonItems.Entities.User')).not.toBeUndefined();
        expect(search(['complexType'])('JayData.Test.CommonItems.Entities.User')).toBeUndefined();
        expect(search(['enumType'])('JayData.Test.CommonItems.Entities.User')).toBeUndefined();
        // next complex
        expect(search(['entityType'])('JayData.Test.CommonItems.Entities.Location')).toBeUndefined();
        expect(search(['complexType'])('JayData.Test.CommonItems.Entities.Location')).not.toBeUndefined();
        expect(search(['enumType'])('JayData.Test.CommonItems.Entities.Location')).toBeUndefined();
        // next enum
        expect(search(['entityType'])('JayData.Test.CommonItems.Entities.UserType')).toBeUndefined();
        expect(search(['complexType'])('JayData.Test.CommonItems.Entities.UserType')).toBeUndefined();
        expect(search(['enumType'])('JayData.Test.CommonItems.Entities.UserType')).toBeUndefined();
        // test helper methods
        const searchFindType = findType(schema);
        expect(searchFindType('JayData.Test.CommonItems.Entities.User')).not.toBeUndefined();
        expect(searchFindType('JayData.Test.CommonItems.Entities.Location')).not.toBeUndefined();
        expect(searchFindType('JayData.Test.CommonItems.Entities.UserType')).toBeUndefined();

        const searchEnum = findEnumType(schema);
        expect(searchEnum('JayData.Test.CommonItems.Entities.User')).toBeUndefined();
        expect(searchEnum('JayData.Test.CommonItems.Entities.Location')).toBeUndefined();
        expect(searchEnum('JayData.Test.CommonItems.Entities.UserType')).toBeUndefined();
    });
})