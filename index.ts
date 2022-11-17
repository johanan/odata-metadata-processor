import { append, compose, filter, find, flatten, has, includes, isNil, lensProp, map, mergeAll, mergeRight, prop, props, propEq, set, split } from 'ramda';

export interface ProcessedProperty
extends ODataProperty, ProcessedEntityType {
  pathName: string;
}

export interface ProcessedEnumProperty
extends ODataProperty, ODataEnumType {}

export interface FullNameEntityType 
extends ODataEntityType {
  fullName: string;
}

export interface ProcessedEntityType 
extends Pick<ODataEntityType, "name" > {
  property: ProcessedProperty [];
  navigationProperty: ProcessedEntityType[];
  isCollection: boolean;
  path: string[];
  member: ODataMember[];
  [x: string | number | symbol]: unknown;
}

export interface ODataProperty {
  name: string;
  type: string;
  nullable?: boolean; 
  maxLength?: number;
  unicode?: string;
  precision?: number;
  scale?: string;
  defaultValue?: string;
  [x: string | number | symbol]: unknown;
}

export interface ODataNavigationProperty {
  name: string;
  type: string;
  [x: string | number | symbol]: unknown;
}

export interface ODataEntityType {
  name: string;
  navigationProperty?: ODataNavigationProperty[];
  property?: ODataProperty[];
  [x: string | number | symbol]: unknown;
}

export interface ODataMember {
  name: string;
  value?: any;
}

export interface ODataEnumType {
  name: string;
  member?: ODataMember[]
}

export interface ODataNamespace {
  namespace: string;
  entityType?: ODataEntityType[];
  complexType?: ODataEntityType[];
  enumType?: ODataEnumType[];
  [x: string | number | symbol]: unknown;
}

export interface ODataDataServices {
  schema: (ODataNamespace | any)[];
  [x: string | number | symbol]: unknown;
}

export interface ODataMetadata {
  dataServices: ODataDataServices;
  [x: string | number | symbol]: unknown;
}

//@ts-ignore
const emptyArray = <A, >(list?: A[]) : A[] => isNil(list) ? [] : list;
const addFullNamespace = map(n => map(e => mergeRight(e, {fullName: `${n.namespace}.${e.name}`}), prop('entityType', n)));

export const namespaceSplit = (fullName: string) => {
  const last = fullName.lastIndexOf('.');
  const namespace = fullName.substring(0, last);
  const name = fullName.substring(last + 1);
  return { namespace, name};
}

export const findAnyType = (metadata: ODataMetadata) => (typesToFind: string[]) => (fullName: string) : any | undefined => {
  const split = namespaceSplit(fullName);

  return compose(
    find(propEq('name', split.name)),
    flatten,
    map(props(typesToFind)),
    filter(propEq('namespace', split.namespace)),
    prop('schema'),
    prop('dataServices')
    )(metadata);
}

export const findType = (metadata: ODataMetadata) : (fullName: string) => ODataEntityType | undefined => findAnyType(metadata)(['entityType', 'complexType']) ;
export const findEnumType = (metadata: ODataMetadata) : (fullName: string) => ODataEnumType | undefined => findAnyType(metadata)(['enumType']);

export const flattenTypes = (metadata: ODataMetadata) : FullNameEntityType[] => compose(
    flatten,
    addFullNamespace,
    filter(has('entityType')),
    filter(has('namespace')),
    prop('schema'),
    prop('dataServices')
  )(metadata);

const collectionRegex = /(collection\()(.*)(\))/i;

export const buildEnum = (metadata: ODataMetadata) => (fullName: string) : ODataEnumType => {
  const search = findEnumType(metadata);
  const entity = search(fullName);
  // enums do not recurse
  return mergeAll([{ member: []}, entity ]);
}

export const buildProperty = (metadata: ODataMetadata) => (fullName: string, prefix = '', parents = [], path = [],) : ProcessedProperty[] => {
  const search = findType(metadata);
  const entity = search(fullName);

  const properties = emptyArray(entity?.property)
  .filter(p => {
    const type = p.type.replace(collectionRegex, '$2');
    return !includes(type, parents);
  })
  .map(p => {
    const newPath = append(p.name, path);
    // always gets set
    const initProp = mergeAll([p, { pathName: `${prefix}${p.name}`, path: newPath}])
    const type = p.type.replace(collectionRegex, '$2');
    const isCollection = collectionRegex.test(p.type);

    // for next step
    const newName = `${prefix}${p.name}.`;
    const recursed = buildProperty(metadata)(type, newName, append(fullName, parents), newPath);
    // check if current type is enum
    const enumProp = buildEnum(metadata)(type);
    return mergeAll([enumProp, { property: recursed }, p, initProp, { isCollection }]);
  });

  return properties;
}

export const buildTypeRoot = (metadata: ODataMetadata) => (fullName: string, prefix = '', parents = [], path = [],) : ProcessedEntityType => {
  const navPropLens = lensProp<any>('navigationProperty');
  const propertyLens = lensProp<any>('property');
  const search = findType(metadata);
  const entity = search(fullName);

  //parse navigations
  const navProps = emptyArray(entity?.navigationProperty)
    .filter(n  => {
      const type = n.type.replace(collectionRegex, '$2');
      //remove circular references
      return !includes(type, parents);
    })
    .map(n => {
      const newName = `${prefix}${n.name}.`;
      const newPath = append(n.name, path);
      const type = n.type.replace(collectionRegex, '$2');
      const navProp = search(type);
      const property = buildProperty(metadata)(type, newName, append(fullName, parents), newPath)
      const isCollection = collectionRegex.test(n.type);
      //recurse here
      const transformed = buildTypeRoot(metadata)(type, newName, append(fullName, parents), newPath);

      return mergeAll([transformed, n, { property, isCollection, path: newPath }]);
    });

  return mergeAll([ set(navPropLens, navProps, entity),
    {
      property: buildProperty(metadata)(fullName, prefix, parents, parents),
      path: [],
    }, 
  ]);
}