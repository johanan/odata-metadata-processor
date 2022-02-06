import { findType, buildTypeRoot, flattenTypes } from '../index';
import { oData } from "ts-odatajs";

//found in MuleSoft documentation for OData
//nice generic CSDL document
const csdl = `<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="odata4.namespace">
      <EntityType Name="Customers"> 
        <Key> 
          <PropertyRef Name="CustomerID" />
        </Key>
        <Property Name="CompanyName" Type="Edm.String" MaxLength="40" Unicode="false" />
        <Property Name="ContactName" Type="Edm.String" MaxLength="30" Unicode="false" />
        <Property Name="ContactTitle" Type="Edm.String" MaxLength="30" Unicode="false" />
        <Property Name="CustomerID" Type="Edm.String" Nullable="false" MaxLength="5" Unicode="false" />
        <NavigationProperty Name="Orders" Type="Collection(odata4.namespace.Orders)"/>
      </EntityType>
      <EntityType Name="Orders">
        <Key>
          <PropertyRef Name="OrderID" />
          <PropertyRef Name="ShipName" />
        </Key>
        <Property Name="Freight" Type="Edm.Decimal" Precision="19" Scale="4" />
        <Property Name="OrderDate" Type="Edm.DateTimeOffset" Unicode="false" />
        <Property Name="OrderID" Type="Edm.Int32" Nullable="false" Unicode="false" />
        <Property Name="CustomerID" Type="Edm.String" MaxLength="5"/>
        <Property Name="Price" Type="Edm.Single" Unicode="false" />
        <Property Name="Priority" Type="Edm.Int16" Unicode="false" />
        <Property Name="ShipAddress" Type="Edm.String" MaxLength="60" Unicode="false" />
        <Property Name="ShipName" Type="Edm.String" Nullable="false" MaxLength="40" Unicode="false" />
        <NavigationProperty Name="Customer" Type="odata4.namespace.Customers">
        	<ReferentialConstraint Property="CustomerID" ReferencedProperty="CustomerID" />
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="OData4EntityContainer"> 
        <EntitySet Name="Customers" EntityType="odata4.namespace.Customers"> 
        	<NavigationPropertyBinding Path="Orders" Target="Orders"/>
        </EntitySet>
        <EntitySet Name="Orders" EntityType="odata4.namespace.Orders"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`

// it comes back as Object
const metadata : any = oData.parseMetadata(csdl);

describe('CSDL Processing', () => {
  it('should test', () => {
    const customers = findType(metadata)('odata4.namespace.Customers');
    
    expect(customers.name).toBe('Customers');
  })
  
  it('should flatten all the types', () => {
      const flat = flattenTypes(metadata);

      expect(flat.length).toBe(2);
      expect(flat[0].fullName).toBe('odata4.namespace.Customers')
      expect(flat[1].fullName).toBe('odata4.namespace.Orders')
  })

  it('should process the tree from Customers', () => {
      const root = buildTypeRoot(metadata)('odata4.namespace.Customers');

      expect(root.name).toBe('Customers');
      expect(root.navigationProperty[0].name).toBe('Orders');
  })
})