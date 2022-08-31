import { append, compose, filter, find, flatten, has, includes, isEmpty, isNil, lensProp, map, mergeAll, mergeRight, prop, propEq, set, split } from 'ramda';

export interface ProcessedProperty
extends ODataProperty {
  pathName: string;
  path: string[];
}

export interface FullNameEntityType 
extends ODataEntityType {
  fullName: string;
}

export interface ProcessedEntityType 
extends Pick<ODataEntityType, "name" > {
  property: ProcessedProperty[];
  navigationProperty: ProcessedEntityType[];
  isCollection: boolean;
  path: string[];
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
const emptyArray = <A, >(list?: A[]) : A[] => isNil(list) ? [] : list;
const addFullNamespace = map(n => map(e => mergeRight(e, {fullName: `${n.namespace}.${e.name}`}), prop('entityType', n)));

export const namespaceSplit = (fullName: string) => {
  const last = fullName.lastIndexOf('.');
  const namespace = fullName.substring(0, last);
  const name = fullName.substring(last + 1);
  return { namespace, name};
}

export const findType = (metadata: ODataMetadata) => (fullName: string) : ODataEntityType | undefined => {
  const split = namespaceSplit(fullName);

  return compose(
    find(propEq('name', split.name)),
    flatten,
    map(prop('entityType')),
    filter(propEq('namespace', split.namespace)),
    prop('schema'),
    prop('dataServices')
    )(metadata);
}

export const flattenTypes = (metadata: ODataMetadata) : FullNameEntityType[] => compose(
    flatten,
    addFullNamespace,
    filter(has('entityType')),
    filter(has('namespace')),
    prop('schema'),
    prop('dataServices')
  )(metadata);

export const buildTypeRoot = (metadata: ODataMetadata) => (fullName: string, prefix = '', parents = [], path = [],) : ProcessedEntityType => {
  const collectionRegex = /(collection\()(.*)(\))/i;
  const navPropLens = lensProp<any>('navigationProperty');
  const search = findType(metadata);
  const entity : ODataEntityType | undefined = search(fullName);

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
      const property = emptyArray(navProp?.property).map(prop => mergeAll([prop, { pathName: `${newName}${prop.name}`, path: append(prop.name, newPath)}]) );
      const isCollection = collectionRegex.test(n.type);
      //recurse here
      const transformed = buildTypeRoot(metadata)(type, newName, append(fullName, parents), newPath);

      return mergeAll([transformed, n, { property, isCollection, path: newPath }]);
    });

  return mergeAll([ set(navPropLens, navProps, entity),
    {
      property: emptyArray(entity?.property).map(prop => mergeAll([prop, { pathName: prop.name, path: [prop.name]}]) ),
      path: [],
    }, 
  ]);
}