# OData Metadata Processor
This library does **not** parse metadata. This library takes parsed OData metadata and moves it around so it is easier to find and work with.

If you need to parse metadata you can use [Olingo(ts-odatajs)](https://www.npmjs.com/package/ts-odatajs) or [JayData(@odata/metadata)](https://www.npmjs.com/package/@odata/metadata). You don't need a parser to use this library. As long as you pass it an object that implements the `ODataMetadata` interface.

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
You first need a metadata object. This can be parsed from the endpoint, a JSON document, or any object that implements the `ODataMetadata` interface. 

Next we need to flatten and extend the Entity Types. 
```js
import {flattenTypes} from 'odata-metadata-processor';

const metadata; //your metadata object, json, whatever
const flattened = flattenTypes(metadata);
```

At this point you have a flat array of every Entity Type defined extended with a `fullName` property that includes the namespace. Using the metadata EDMX above:
```js
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

This can be easily filtered and checked for a specific type. Except we still have the self reference problem. 

Finally we can process a specific type and build a tree from that root.
```js
import { buildTypeRoot, flattenTypes } from 'odata-metadata-processor';

const metadata; //your metadata object, json, whatever
const flattened = flattenTypes(metadata);
const root = buildTypeRoot(flattened)('odata4.namespace.Customers');
```

The root takes the fully qualified name and returns the entire tree to the Nth recursion. In our example above.
```js
{
    name: 'Customers',
    key: { propertyRef: [ [Object] ] },
    property: [
        {
        name: 'CustomerID',
        type: 'Edm.String',
        pathName: 'CustomerID'
        }
    ],
    navigationProperty: [
        {
        name: 'Orders',
        key: [Object],
        property: [
        {
            name: 'OrderID',
            type: 'Edm.Int32',
            pathName: 'Orders.OrderID'
        },
        ],
        navigationProperty: [],
        fullName: 'odata4.namespace.Orders',
        type: 'Collection(odata4.namespace.Orders)'
        }
    ],
    fullName: 'odata4.namespace.Customers'
}
```

Now `Customers` has the full entity under the navigation property that matches the type. In addition to this each property has a `pathName` that gives the full path from the root which can be used to access that property when needed.

## Typescript Types
The interfaces used only specify what properties are required to process the metadata. The types follow what is specified in [OData 4.0 CSDL spec](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html). Each interface allows for any other field to be present and used without causing type problems.

The returned types include every field that was present in the original object in addition to the extended fields.