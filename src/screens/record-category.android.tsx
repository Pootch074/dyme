import {
  AlertDialog,
  Box,
  Button,
  Card,
  Column,
  FloatingActionButton,
  HorizontalDivider,
  Icon,
  IconButton,
  Image,
  LazyColumn,
  ListItem,
  ModalBottomSheet,
  OutlinedButton,
  Row,
  Spacer,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  align,
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  height,
  imePadding,
  padding,
  paddingAll,
  Shapes,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useState } from 'react';

import { Icons } from '@/components/compose/icons';
import { PhotoField } from '@/components/compose/photo-field';
import { RecordFieldControl } from '@/components/compose/record-field';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import type { RecordCategory } from '@/constants/record-categories';
import { entryTitle, useEntryEditor } from '@/hooks/use-entry-editor';
import type { RecordEntry } from '@/hooks/use-records';
import {
  buildEntryDetails,
  type EntryDetail,
  entryTimelineDate,
  formatTimelineDate,
} from '@/utils/record-format';
import { resolveImageUri } from '@/utils/record-image';

export type RecordCategoryScreenProps = {
  category: RecordCategory;
};

const TRANSPARENT = '#00000000';

/** A category's entries, with the add / details / edit sheet. */
export function RecordCategoryScreen({ category }: RecordCategoryScreenProps) {
  const editor = useEntryEditor(category);
  const colors = useAppMaterialColors();
  const { sections, isLoading, pendingDeleteEntry } = editor;

  return (
    <ComposeScreen>
      <Box modifiers={[fillMaxSize()]}>
        <LazyColumn
          modifiers={[fillMaxSize()]}
          // Bottom padding keeps the last row clear of the floating button.
          contentPadding={{ start: 16, end: 16, top: 16, bottom: 96 }}
          verticalArrangement={{ spacedBy: 8 }}>
          <ScreenHeader
            title={`${category.emoji} ${category.label}`}
            subtitle={category.description}
            onBack={() => router.back()}
          />

          {!isLoading && sections.length === 0 ? (
            <Text
              color={colors.onSurfaceVariant}
              style={{ typography: 'bodyMedium', textAlign: 'center' }}
              modifiers={[fillMaxWidth(), padding(0, 32, 0, 0)]}>
              No entries yet. Tap + to add your first one.
            </Text>
          ) : null}

          {sections.flatMap((section) => [
            <Text
              key={`heading-${section.title}`}
              color={colors.primary}
              style={{ typography: 'labelLarge' }}
              modifiers={[padding(4, 16, 0, 0)]}>
              {section.title}
            </Text>,
            ...section.data.map((entry) => (
              <EntryRow
                key={entry.id}
                title={entryTitle(category, entry)}
                timeline={formatTimelineDate(entryTimelineDate(category, entry))}
                onOpen={() => editor.openEntry(entry.id)}
                onRemove={() => editor.requestRemove(entry.id)}
              />
            )),
          ])}
        </LazyColumn>

        <FloatingActionButton
          onClick={editor.startAdd}
          modifiers={[align('bottomEnd'), paddingAll(16)]}>
          <FloatingActionButton.Icon>
            <Icon source={Icons.add} contentDescription={`Add ${category.label} entry`} />
          </FloatingActionButton.Icon>
        </FloatingActionButton>
      </Box>

      {editor.dialogMode !== null ? <EntrySheet category={category} editor={editor} /> : null}

      {pendingDeleteEntry ? (
        <AlertDialog onDismissRequest={editor.cancelRemove}>
          <AlertDialog.Icon>
            <Icon source={Icons.delete} />
          </AlertDialog.Icon>
          <AlertDialog.Title>
            <Text>Remove entry?</Text>
          </AlertDialog.Title>
          <AlertDialog.Text>
            <Text>{`"${entryTitle(category, pendingDeleteEntry)}" will be permanently removed.`}</Text>
          </AlertDialog.Text>
          <AlertDialog.ConfirmButton>
            <TextButton onClick={editor.confirmRemove} colors={{ contentColor: colors.error }}>
              <Text>Delete</Text>
            </TextButton>
          </AlertDialog.ConfirmButton>
          <AlertDialog.DismissButton>
            <TextButton onClick={editor.cancelRemove}>
              <Text>Cancel</Text>
            </TextButton>
          </AlertDialog.DismissButton>
        </AlertDialog>
      ) : null}
    </ComposeScreen>
  );
}

type EntryRowProps = {
  title: string;
  /** The entry's timeline date, e.g. "Aug 15 2026". */
  timeline: string;
  onOpen: () => void;
  onRemove: () => void;
};

/** Compact entry row: the name with its timeline date beside it, and a delete action; tapping it opens the details. */
function EntryRow({ title, timeline, onOpen, onRemove }: EntryRowProps) {
  const colors = useAppMaterialColors();
  return (
    <Card modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(12)), clickable(onOpen)]}>
      <ListItem colors={{ containerColor: TRANSPARENT }}>
        <ListItem.HeadlineContent>
          <Text maxLines={1} overflow="ellipsis" style={{ typography: 'titleMedium' }}>
            {title}
          </Text>
        </ListItem.HeadlineContent>
        <ListItem.TrailingContent>
          <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 4 }}>
            <Text color={colors.onSurfaceVariant} style={{ typography: 'labelLarge' }}>
              {timeline}
            </Text>
            <IconButton onClick={onRemove}>
              <Icon source={Icons.delete} contentDescription={`Remove ${title}`} />
            </IconButton>
          </Row>
        </ListItem.TrailingContent>
      </ListItem>
    </Card>
  );
}

type EntrySheetProps = {
  category: RecordCategory;
  editor: ReturnType<typeof useEntryEditor>;
};

/** Bottom sheet showing an entry's details, or the Add / Edit Entry form. */
function EntrySheet({ category, editor }: EntrySheetProps) {
  const colors = useAppMaterialColors();

  return (
    <ModalBottomSheet onDismissRequest={editor.closeDialog} skipPartiallyExpanded>
      <Column
        modifiers={[fillMaxWidth(), verticalScroll(), imePadding(), padding(24, 0, 24, 24)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
          <Column modifiers={[weight(1)]}>
            <Text maxLines={2} overflow="ellipsis" style={{ typography: 'headlineSmall' }}>
              {editor.dialogTitle}
            </Text>
            {editor.isFormMode ? (
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                {`${category.emoji} ${category.label}`}
              </Text>
            ) : null}
          </Column>
          <IconButton onClick={editor.closeDialog}>
            <Icon source={Icons.close} contentDescription="Close" />
          </IconButton>
        </Row>

        {editor.dialogMode === 'details' && editor.selectedEntry ? (
          <EntryDetails
            category={category}
            entry={editor.selectedEntry}
            onEdit={editor.startEdit}
          />
        ) : null}

        {editor.isFormMode ? <EntryForm category={category} editor={editor} /> : null}
      </Column>
    </ModalBottomSheet>
  );
}

type EntryDetailsProps = {
  category: RecordCategory;
  entry: RecordEntry;
  onEdit: () => void;
};

function EntryDetails({ category, entry, onEdit }: EntryDetailsProps) {
  const colors = useAppMaterialColors();
  const details = buildEntryDetails(category, entry);

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 16 }}>
      {entry.imageRef ? (
        <Image
          source={{ uri: resolveImageUri(entry.imageRef) }}
          contentScale="crop"
          contentDescription={`Photo of ${entryTitle(category, entry)}`}
          modifiers={[fillMaxWidth(), height(220), clip(Shapes.RoundedCorner(12))]}
        />
      ) : null}

      <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 12 }}>
        {details.map((detail, index) => (
          <Column key={detail.label} verticalArrangement={{ spacedBy: 12 }}>
            {index > 0 ? <HorizontalDivider color={colors.outlineVariant} /> : null}
            <DetailRow detail={detail} />
          </Column>
        ))}
      </Column>

      <Button onClick={onEdit} modifiers={[fillMaxWidth()]}>
        <Icon source={Icons.edit} size={18} />
        <Spacer modifiers={[width(8)]} />
        <Text>Edit</Text>
      </Button>
    </Column>
  );
}

/** One label / value line; a sensitive value stays masked until its eye button is tapped. */
function DetailRow({ detail }: { detail: EntryDetail }) {
  const colors = useAppMaterialColors();
  const [revealed, setRevealed] = useState(false);
  const isSensitive = detail.masked !== undefined;

  return (
    <Row
      modifiers={[fillMaxWidth()]}
      horizontalArrangement={{ spacedBy: 16 }}
      verticalAlignment="center">
      <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
        {detail.label}
      </Text>
      <Text style={{ typography: 'bodyLarge', textAlign: 'end' }} modifiers={[weight(1)]}>
        {isSensitive && !revealed ? detail.masked : detail.value}
      </Text>
      {isSensitive ? (
        <IconButton onClick={() => setRevealed((shown) => !shown)}>
          <Icon
            source={revealed ? Icons.visibilityOff : Icons.visibility}
            contentDescription={`${revealed ? 'Hide' : 'Show'} ${detail.label.toLowerCase()}`}
          />
        </IconButton>
      ) : null}
    </Row>
  );
}

function EntryForm({ category, editor }: EntrySheetProps) {
  const colors = useAppMaterialColors();
  const submitLabel = editor.isSaving
    ? 'Saving…'
    : editor.dialogMode === 'edit'
      ? 'Save changes'
      : 'Add entry';

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 16 }}>
      <PhotoField value={editor.imageUri} onChange={editor.changeImage} />

      {category.fields.map((field) => (
        <RecordFieldControl
          key={field.key}
          field={field}
          value={editor.values[field.key] ?? ''}
          onChange={(value) => editor.changeField(field.key, value)}
          error={editor.fieldErrors[field.key]}
        />
      ))}

      {editor.error ? (
        <Text color={colors.error} style={{ typography: 'bodySmall' }}>
          {editor.error}
        </Text>
      ) : null}

      <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
        {editor.dialogMode === 'edit' ? (
          <OutlinedButton
            onClick={editor.cancelEdit}
            enabled={!editor.isSaving}
            modifiers={[weight(1)]}>
            <Text>Cancel</Text>
          </OutlinedButton>
        ) : null}
        <Button onClick={editor.submit} enabled={!editor.isSaving} modifiers={[weight(1)]}>
          <Text>{submitLabel}</Text>
        </Button>
      </Row>
    </Column>
  );
}
