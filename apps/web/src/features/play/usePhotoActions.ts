import { useMutation } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { ApiRequestError } from "../../lib/api";
import { removeAvatar, resizeAvatar, uploadAvatar } from "../../lib/avatar";
import type { PlayerCredentials } from "../../lib/credentials";
import { useErrorMessage } from "../../lib/errors";
import { showPlayerLook } from "../../lib/lobby";

export const usePhotoActions = (credentials: PlayerCredentials) => {
  const intl = useIntl();
  const formatError = useErrorMessage();
  const upload = useMutation({
    mutationFn: async (file: File) => uploadAvatar(credentials, await resizeAvatar(file)),
    onSuccess: ({ avatarVersion }) => showPlayerLook(credentials.playerId, { avatarVersion }),
  });
  const remove = useMutation({
    mutationFn: () => removeAvatar(credentials),
    onSuccess: () => showPlayerLook(credentials.playerId, { avatarVersion: null }),
  });
  const error = upload.error ?? remove.error;
  const describe = (failure: Error) =>
    failure instanceof ApiRequestError ? formatError(failure.error) : intl.formatMessage({ id: "waiting.photoFailed" });

  return {
    upload: (file: File) => {
      remove.reset();
      upload.mutate(file);
    },
    remove: () => {
      upload.reset();
      remove.mutate();
    },
    isUploading: upload.isPending,
    isBusy: upload.isPending || remove.isPending,
    errorMessage: error ? describe(error) : undefined,
  };
};
