# OData Metadata Processor
This library does **not** parse metadata. This library takes parsed OData metadata and turns it into a tree starting from a specific entity.

If you need to parse metadata you can use [Olingo(ts-odatajs)](https://www.npmjs.com/package/ts-odatajs) or [JayData(@odata/metadata)](https://www.npmjs.com/package/@odata/metadata). You don't need a parser to use this library, you just need an object that implements the `ODataMetadata` interface.

## Why a Metadata Processor
OData metadata is great. It can easily give root entity names, property names, property types, reltionships, and more. The downside is that the metadata is self referential. Everytime you need to look up the definition of an entity you have to search the entire document again. 

For example:
```xml
<!-- Information omitted for brevity -->
<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx Version="4.0" >
  <edmx:DataServices>
    <Schema >
      <EntityType Name="Customers"> 
        <Key> 
          <PropertyRef Name="CustomerID" />
        </Key>
        <Property Name="CustomerID" Type="Edm.String" />
        <NavigationProperty Name="Orders" Type="Collection(odata4.namespace.Orders)"/>
      </EntityType>
      <EntityType Name="Orders">
        <Key>
          <PropertyRef Name="OrderID" />
        </Key>
        <Property Name="OrderID" Type="Edm.Int32" />
        <NavigationProperty Name="Customer" Type="odata4.namespace.Customers">
        	<ReferentialConstraint Property="CustomerID" ReferencedProperty="CustomerID" />
        </NavigationProperty>
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

We can see that `Customers` has a child of `Orders`, but it is just a reference to the type of `Orders`. We don't know what fields `Orders` has unless we look it up in the document.

Further, if we were to `$expand=Orders` in an OData query, to reference properties on the object that comes back we would have to use `Orders.OrderId`. We would need to know the property names in the context of the navigation property.

That is where `odata-metadata-processor` comes in.

## QuickStart/How to Use
You first need a metadata object. This can be parsed from an endpoint, a JSON document, or any object that conforms to the `ODataMetadata` interface. 

We can process a specific type and build a tree from that root.
```js
import { buildTypeRoot } from 'odata-metadata-processor';

const metadata; //your metadata object, json, whatever
const root = buildTypeRoot(metadata)('odata4.namespace.Customers');
``` 

The root takes the metadata and the fully qualified name and returns the entire tree to the leaf nodes.  Any circular references are removed. If a type has already been parsed, it will not parse it again.

Using our example above:
```js
{
    name: 'Customers',
    key: { propertyRef: [ [Object] ] },
    path: [],
    property: [
        {
        isCollection: false,
        name: 'CustomerID',
        property: [],
        member: [],
        type: 'Edm.String',
        pathName: 'CustomerID',
        path: ['CustomerID']
        }
    ],
    navigationProperty: [
        {
        isCollection: true,
        name: 'Orders',
        key: [Object],
        path: ['Orders'],
        property: [
        {
            name: 'OrderID',
            type: 'Edm.Int32',
            pathName: 'Orders.OrderID',
            path: ['Orders', 'OrderID']
        },
        ],
        navigationProperty: [],
        type: 'Collection(odata4.namespace.Orders)'
        }
    ],
}
```

Now `Customers` has the full entity under the navigation property that matches the type. In addition to this each property has a `pathName` and `path` that gives the full path as a string and an array respectively, from the root which can be used to access that property when needed.

`buildTypeRoot` is a function that returns a function that takes the full name of the type. This allows you to *bind* the search function to a metadata. This can be passed around and used to build other types from the same metadata.

In our example above you could bind the metadata and then build from `odata4.namespace.Orders` which would have `Customers` as a child.

## Complex and Enum Types
Properties can be a complex type; a type that has properties but is not an entity and a navigation, or an enum type; a set of values. 
Each type will include any properties (for complex) or members (for enum) at the same level as the property. 

## findType
`findType` is the helper method that does all the searching. In the same way `buildTypeRoot` binds the metadata, `findType` does the same. First pass in the metadata and you will get back a function to search for the fully qualified name in the metadata.

```js
import { findType } from 'odata-metadata-processor';

const customers = findType(metadata)('odata4.namespace.Customers');
//returns the Entity Type or undefined
```

`buildTypeRoot` uses this function to find each navigation property and merge it into the object structure.

## Typescript Types
The interfaces used only specify what properties are required to process the metadata. The types follow what is specified in [OData 4.0 CSDL spec](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html). Each interface allows for any other field to be present and used without causing type problems.

The returned types are extensions of the objects passed in. The properties of the original object are kept and new properties are added to extend functionality.

## Flattened Namespaces
The `flattenTypes` takes all the types across all Namespaces and returns it as an array of all the types. When doing this you lose access to the namespace, so we add that back in as `fullName`.

Using the above EDMX, here is what flattened types would look like:
```js
import {flattenTypes} from 'odata-metadata-processor';

const metadata; //your metadata object, json, whatever
const flattened = flattenTypes(metadata);
// would look like this
[
{
    name: 'Customers',
    key: { propertyRef: [ [Object] ] },
    property: [
        {
        name: 'CustomerID',
        type: 'Edm.String',
        }
    ],
    navigationProperty: [ { name: 'Orders', type: 'Collection(odata4.namespace.Orders)' } ],
    fullName: 'odata4.namespace.Customers'
},
{
    name: 'Orders',
    key: { propertyRef: [ [Object] ] },
    property: [
        {
        name: 'OrderID',
        type: 'Edm.Int32',
        },
    ],
    navigationProperty: [
        {
        name: 'Customer',
        type: 'odata4.namespace.Customers',
        referentialConstraint: [Array]
        }
    ],
    fullName: 'odata4.namespace.Orders'
    }
]
```