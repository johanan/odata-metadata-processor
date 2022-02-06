import { namespaceSplit } from '../index';

describe('namespaceSplit', () =>{
    it('should split on last peroid', () => {
        const name = 'odata4.namespace.Customers';
        const split = namespaceSplit(name);
        expect(split.name).toBe('Customers');
        expect(split.namespace).toBe('odata4.namespace');
    })
})