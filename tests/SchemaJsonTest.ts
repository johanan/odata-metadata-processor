import { buildProperty, buildTypeRoot, findAnyType, findEnumType, findType, flattenTypes } from '../index';

//pulled from jaystack OData library
//ensures compatibility
const schema = require('../schemas/schema_sd.json');

describe('Schema JSON Processing', () => {
    it('should flatten all the types', () => {
        const flat = flattenTypes(schema);
        expect(flat.length).toBe(10);
        expect(flat[0].fullName).toBe('JayData.Test.CommonItems.Entities.User');
        expect(flat[1].fullName).toBe('JayData.Test.CommonItems.Entities.Article');
        expect(flat[2].fullName).toBe('JayData.Test.CommonItems.Entities.UserProfile');
        expect(flat[3].fullName).toBe('JayData.Test.CommonItems.Entities.Category');
        expect(flat[4].fullName).toBe('JayData.Test.CommonItems.Entities.Tag');
        expect(flat[5].fullName).toBe('JayData.Test.CommonItems.Entities.TestItem');
        expect(flat[6].fullName).toBe('JayData.Test.CommonItems.Entities.TagConnection');
        expect(flat[7].fullName).toBe('JayData.Test.CommonItems.Entities.TestItemGuid');
        expect(flat[8].fullName).toBe('JayData.Test.CommonItems.Entities.TestItemGroup');
        expect(flat[9].fullName).toBe('JayData.Test.CommonItems.Entities.TestItemType');
    })

    it('should find the types based on type of type', () => {
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
        expect(search(['enumType'])('JayData.Test.CommonItems.Entities.UserType')).not.toBeUndefined();
        // test helper methods
        const searchFindType = findType(schema);
        expect(searchFindType('JayData.Test.CommonItems.Entities.User')).not.toBeUndefined();
        expect(searchFindType('JayData.Test.CommonItems.Entities.Location')).not.toBeUndefined();
        expect(searchFindType('JayData.Test.CommonItems.Entities.UserType')).toBeUndefined();

        const searchEnum = findEnumType(schema);
        expect(searchEnum('JayData.Test.CommonItems.Entities.User')).toBeUndefined();
        expect(searchEnum('JayData.Test.CommonItems.Entities.Location')).toBeUndefined();
        expect(searchEnum('JayData.Test.CommonItems.Entities.UserType')).not.toBeUndefined();
    })

    it('should process the tree from each root', () => {
        const root = buildTypeRoot(schema)('JayData.Test.CommonItems.Entities.User');
        expect(root.name).toBe('User');
        expect(root.path).toStrictEqual([]);
        const id = root.property[0];
        expect(id.name).toBe('Id');
        expect(id.pathName).toBe('Id');
        expect(id.path).toStrictEqual(['Id']);
        expect(id.property.length).toBe(0);
        expect(id.member.length).toBe(0);
        // enum prop
        const userType = root.property[3];
        expect(userType.name).toBe('UserType');
        expect(userType.pathName).toBe('UserType');
        expect(userType.path).toStrictEqual(['UserType']);
        expect(userType.property.length).toBe(0);
        expect(userType.member.length).toBe(3);

        var article = root.navigationProperty[0];

        expect(article.name).toBe('ReviewedArticles');
        expect(article.path).toStrictEqual(['ReviewedArticles']);
        expect(article.isCollection).toBe(true);
        //props
        expect(article.property.length).toBe(8);
        expect(article.property[0].pathName).toBe('ReviewedArticles.RowVersion');
        expect(article.property[0].path).toStrictEqual(['ReviewedArticles', 'RowVersion']);
        //navprops
        expect(article.navigationProperty.length).toBe(2);
        expect(article.navigationProperty[0].name).toBe('Category');
        expect(article.navigationProperty[0].property[0].pathName).toBe('ReviewedArticles.Category.RowVersion');
        expect(article.navigationProperty[0].property[0].path).toStrictEqual(['ReviewedArticles', 'Category', 'RowVersion']);

        var profile = root.navigationProperty[2];

        expect(profile.name).toBe('Profile');
        expect(profile.isCollection).toBe(false);
        //props
        expect(profile.property.length).toBe(6);
        expect(profile.property[0].pathName).toBe('Profile.Id');
        expect(profile.property[0].path).toStrictEqual(['Profile', 'Id']);
        // complex prop
        const location = profile.property[5];
        expect(location.property.length).toBe(4);
        //navprops
        expect(profile.navigationProperty.length).toBe(0);
    })
})