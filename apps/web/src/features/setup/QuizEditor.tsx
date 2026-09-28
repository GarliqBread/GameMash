import {
  isQuestionComplete,
  POP_QUIZ_ANSWER_MAX_LENGTH,
  POP_QUIZ_MAX_QUESTIONS,
  POP_QUIZ_QUESTION_MAX_LENGTH,
  POP_QUIZ_TEXT_MAX_RUNS,
  type PopQuizConfig,
  QUIZ_ANSWER_KEYS,
  type QuizQuestion,
} from "@gamemash/games/config";
import { stripHiddenCharacters } from "@gamemash/shared";
import {
  AnswerTileEditor,
  ConfirmDialog,
  CopyIcon,
  QuestionTabs,
  RichTextField,
  ToolButton,
  TrashIcon,
} from "@gamemash/ui";
import { useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { QuestionImages } from "./QuestionImages";
import { QuestionSettings } from "./QuestionSettings";
import { addQuestion, deleteQuestion, insertQuestionAfter, newQuestionId, updateQuestion } from "./setup-changes";
import type { ImageUploads } from "./useImageUploads";

export type QuizEditorProps = {
  config: PopQuizConfig;
  onChange: (change: (config: PopQuizConfig) => PopQuizConfig) => void;
  selectedQuestionId: string | undefined;
  onSelectQuestion: (id: string) => void;
  uploads: ImageUploads;
  imagesEnabled: boolean;
};

export const QuizEditor = ({
  config,
  onChange,
  selectedQuestionId,
  onSelectQuestion,
  uploads,
  imagesEnabled,
}: QuizEditorProps) => {
  const intl = useIntl();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deletingPosition, setDeletingPosition] = useState(1);
  const questionFieldRef = useRef<HTMLElement>(null);
  const question = config.questions.find((item) => item.id === selectedQuestionId) ?? config.questions[0];
  if (!question) return null;

  const position = config.questions.indexOf(question) + 1;
  const change = (update: (current: QuizQuestion) => QuizQuestion) =>
    onChange((current) => updateQuestion(current, question.id, update));

  const handleAdd = () => {
    const id = newQuestionId();
    onChange((current) => addQuestion(current, id));
    onSelectQuestion(id);
  };

  const handleDuplicate = () => {
    const id = newQuestionId();
    onChange((current) => insertQuestionAfter(current, question.id, { ...question, id }));
    onSelectQuestion(id);
  };

  const handleDelete = () => {
    const neighbour = config.questions[position] ?? config.questions[position - 2];
    onChange((current) => deleteQuestion(current, question.id));
    if (neighbour) onSelectQuestion(neighbour.id);
    setIsConfirmingDelete(false);
  };

  return (
    <>
      <QuestionTabs
        questionIds={config.questions.map((item) => item.id)}
        incompleteIds={config.questions.filter((item) => !isQuestionComplete(item)).map((item) => item.id)}
        value={question.id}
        onValueChange={onSelectQuestion}
        listLabel={intl.formatMessage({ id: "setup.questions" })}
        tabLabel={(tabPosition, isIncomplete) =>
          intl.formatMessage({ id: "setup.questionTab" }, { position: tabPosition, isIncomplete: String(isIncomplete) })
        }
        addLabel={intl.formatMessage({ id: "setup.addQuestion" })}
        onAdd={handleAdd}
        canAdd={config.questions.length < POP_QUIZ_MAX_QUESTIONS}
      >
        <div className="flex flex-col gap-5">
          <RichTextField
            key={question.id}
            ref={questionFieldRef}
            label={<FormattedMessage id="setup.questionLabel" values={{ position }} />}
            value={question.text}
            onValueChange={(text) => change((current) => ({ ...current, text }))}
            maxLength={POP_QUIZ_QUESTION_MAX_LENGTH}
            maxRuns={POP_QUIZ_TEXT_MAX_RUNS}
            normalizeText={stripHiddenCharacters}
            counterLabel={(length, max) => intl.formatMessage({ id: "setup.counter" }, { length, max })}
            placeholder={intl.formatMessage({ id: "setup.questionPlaceholder" })}
            toolbarLabel={intl.formatMessage({ id: "setup.formatting" })}
            markLabels={{
              bold: intl.formatMessage({ id: "setup.bold" }),
              italic: intl.formatMessage({ id: "setup.italic" }),
              underline: intl.formatMessage({ id: "setup.underline" }),
            }}
          />
          <AnswerTileEditor
            legend={<FormattedMessage id="setup.answersLegend" />}
            answers={QUIZ_ANSWER_KEYS.map((shape) => {
              const shapeName = intl.formatMessage({ id: "setup.shapeName" }, { shape });
              return {
                shape,
                value: question.answers[shape],
                inputLabel: intl.formatMessage({ id: "setup.answerLabel" }, { shape: shapeName }),
                correctAriaLabel: intl.formatMessage({ id: "setup.markCorrectLabel" }, { shape: shapeName }),
              };
            })}
            onAnswerChange={(shape, value) =>
              change((current) => ({ ...current, answers: { ...current.answers, [shape]: value } }))
            }
            correct={question.correct}
            onCorrectChange={(shape) => change((current) => ({ ...current, correct: shape }))}
            correctLabel={<FormattedMessage id="setup.correct" />}
            markCorrectLabel={<FormattedMessage id="setup.markCorrect" />}
            maxLength={POP_QUIZ_ANSWER_MAX_LENGTH}
            placeholder={intl.formatMessage({ id: "setup.answerPlaceholder" })}
          />
          <QuestionSettings config={config} question={question} onChange={change} />
          <QuestionImages question={question} onChange={change} uploads={uploads} isEnabled={imagesEnabled}>
            <ToolButton
              icon={<CopyIcon size={18} strokeWidth={2.2} />}
              onClick={handleDuplicate}
              disabled={config.questions.length >= POP_QUIZ_MAX_QUESTIONS}
            >
              <FormattedMessage id="setup.duplicate" />
            </ToolButton>
            <ToolButton
              icon={<TrashIcon size={18} strokeWidth={2.2} />}
              onClick={() => {
                setDeletingPosition(position);
                setIsConfirmingDelete(true);
              }}
              disabled={config.questions.length <= 1}
            >
              <FormattedMessage id="setup.deleteQuestion" />
            </ToolButton>
          </QuestionImages>
        </div>
      </QuestionTabs>
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={<FormattedMessage id="setup.deleteQuestionTitle" values={{ position: deletingPosition }} />}
        description={<FormattedMessage id="setup.cannotUndo" />}
        confirmLabel={<FormattedMessage id="setup.deleteQuestion" />}
        cancelLabel={<FormattedMessage id="setup.keep" />}
        onConfirm={handleDelete}
        finalFocus={questionFieldRef}
      />
    </>
  );
};
