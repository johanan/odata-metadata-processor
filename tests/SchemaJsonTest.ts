import { buildTypeRoot, flattenTypes } from '../index';

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

    it('should process the tree from each root', () => {
        const flat = flattenTypes(schema);
        const root = buildTypeRoot(schema)('JayData.Test.CommonItems.Entities.User');
        expect(root.name).toBe('User');
        var article = root.navigationProperty[0];
        console.log(article)
        expect(article.name).toBe('ReviewedArticles');
        //props
        expect(article.property.length).toBe(8);
        expect(article.property[0].pathName).toBe('ReviewedArticles.RowVersion');
        //navprops
        expect(article.navigationProperty.length).toBe(2);
        expect(article.navigationProperty[0].name).toBe('Category');
        expect(article.navigationProperty[0].property[0].pathName).toBe('ReviewedArticles.Category.RowVersion');
    })
})