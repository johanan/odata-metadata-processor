import { append, compose, filter, find, flatten, has, includes, isEmpty, isNil, lensProp, map, mergeAll, mergeRight, over, prop, propEq, set } from 'ramda';

export interface ProcessedProperty
extends ODataProperty {
  pathName: string
}

export interface FullNameEntityType 
extends ODataEntityType {
  fullName: string,
}

export interface ProcessedEntityType 
extends Pick<FullNameEntityType, "fullName" | "name" > {
  property: ProcessedProperty[];
  navigationProperty: ProcessedEntityType[];
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

export interface ODataNamespace {
  namespace: string;
  entityType: ODataEntityType[];
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
const emptyArray = <A, >(list?: A[]) : A[] => isEmpty(list) || isNil(list) ? [] : list;
const addFullNamespace = map(n => map(e => mergeRight(e, {fullName: `${n.namespace}.${e.name}`}), prop('entityType', n)));

export const flattenTypes = (metadata: ODataMetadata) : FullNameEntityType[] => compose(
    flatten,
    addFullNamespace,
    filter(has('entityType')),
    filter(has('namespace')),
    prop('schema'),
    prop('dataServices')
  )(metadata);

export const buildTypeRoot = (flattenedTypes : FullNameEntityType[]) => (fullName: string, prefix = '', parents = []) : ProcessedEntityType => {
  const collectionRegex = /(collection\()(.*)(\))/i;
  const nameLens = lensProp<any>('name');
  const navPropLens = lensProp<any>('navigationProperty');
  const entity : FullNameEntityType = find(propEq('fullName', fullName), flattenedTypes);

  //parse navigations
  const navProps = emptyArray(entity.navigationProperty)
    .filter(n  => {
      const type = n.type.replace(collectionRegex, '$2');
      //remove circular references
      return !includes(type, parents);
    })
    .map(n => {
      const newName = `${prefix}${n.name}.`;
      const type = n.type.replace(collectionRegex, '$2');
      const navProp = find(propEq('fullName', type), flattenedTypes);
      const property = navProp.property.map(prop => mergeAll([prop, { pathName: `${newName}${prop.name}`}]) );
      //recurse here
      const transformed = buildTypeRoot(flattenedTypes)(type, newName, append(fullName, parents));

      return mergeAll([transformed, n, { property }]);
    });

  return mergeAll([ set(navPropLens, navProps, entity),
    {
      property: emptyArray(entity.property).map(prop => mergeAll([prop, { pathName: prop.name}]) )
    }, 
  ]);
}