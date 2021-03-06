// @flow

import type { $Response, $Request } from 'express';
import type { Viewer } from '../session/viewer';
import type {
  CalendarQuery,
  SaveEntryRequest,
  CreateEntryRequest,
  DeleteEntryRequest,
  DeleteEntryResponse,
  RestoreEntryRequest,
  RestoreEntryResponse,
  FetchEntryInfosResponse,
  SaveEntryResult,
} from 'lib/types/entry-types';
import type { FetchEntryRevisionInfosResult } from 'lib/types/history-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';

import { tShape, tDate } from '../utils/tcomb-utils';
import { verifyThreadID } from '../fetchers/thread-fetchers';
import {
  fetchEntryInfos,
  fetchEntryRevisionInfo,
} from '../fetchers/entry-fetchers';
import createEntry from '../creators/entry-creator';
import { updateEntry } from '../updaters/entry-updaters';
import { deleteEntry, restoreEntry } from '../deleters/entry-deleters';

const entryQueryInputValidator = tShape({
  navID: t.String,
  startDate: tDate,
  endDate: tDate,
  includeDeleted: t.maybe(t.Boolean),
});

async function entryFetchResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<FetchEntryInfosResponse> {
  const entryQuery: CalendarQuery = (req.body: any);
  if (!entryQueryInputValidator.is(entryQuery)) {
    throw new ServerError('invalid_parameters');
  }

  let validNav = entryQuery.navID === "home";
  if (!validNav) {
    validNav = await verifyThreadID(entryQuery.navID);
  }
  if (!validNav) {
    throw new ServerError('invalid_parameters');
  }

  return await fetchEntryInfos(viewer, entryQuery);
}

type EntryRevisionHistoryFetch = {|
  id: string,
|};
const entryRevisionHistoryFetchInputValidator = tShape({
  id: t.String,
});

async function entryRevisionFetchResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<FetchEntryRevisionInfosResult> {
  const entryRevisionHistoryFetch: EntryRevisionHistoryFetch = (req.body: any);
  if (!entryRevisionHistoryFetchInputValidator.is(entryRevisionHistoryFetch)) {
    throw new ServerError('invalid_parameters');
  }

  const entryHistory = await fetchEntryRevisionInfo(
    viewer,
    entryRevisionHistoryFetch.id,
  );
  return { result: entryHistory };
}

const createEntryRequestInputValidator = tShape({
  text: t.String,
  sessionID: t.String,
  timestamp: t.Number,
  date: tDate,
  threadID: t.String,
});

async function entryCreationResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<SaveEntryResult> {
  const createEntryRequest: CreateEntryRequest = (req.body: any);
  if (!createEntryRequestInputValidator.is(createEntryRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await createEntry(viewer, createEntryRequest);
}

const saveEntryRequestInputValidator = tShape({
  entryID: t.String,
  text: t.String,
  prevText: t.String,
  sessionID: t.String,
  timestamp: t.Number,
});

async function entryUpdateResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<SaveEntryResult> {
  const saveEntryRequest: SaveEntryRequest = (req.body: any);
  if (!saveEntryRequestInputValidator.is(saveEntryRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await updateEntry(viewer, saveEntryRequest);
}

const deleteEntryRequestInputValidator = tShape({
  entryID: t.String,
  prevText: t.String,
  sessionID: t.String,
  timestamp: t.Number,
});

async function entryDeletionResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<DeleteEntryResponse> {
  const deleteEntryRequest: DeleteEntryRequest = (req.body: any);
  if (!deleteEntryRequestInputValidator.is(deleteEntryRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await deleteEntry(viewer, deleteEntryRequest);
}

const restoreEntryRequestInputValidator = tShape({
  entryID: t.String,
  sessionID: t.String,
  timestamp: t.Number,
});

async function entryRestorationResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<RestoreEntryResponse> {
  const restoreEntryRequest: RestoreEntryRequest = (req.body: any);
  if (!restoreEntryRequestInputValidator.is(restoreEntryRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await restoreEntry(viewer, restoreEntryRequest);
}

export {
  entryQueryInputValidator,
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
};
