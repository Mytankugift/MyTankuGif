import {
  FocusModal,
  Heading,
  Button,
  Text,
  Label,
  Badge,
  Textarea,
} from "@medusajs/ui";
import { useState } from "react";
import { SellerRequest } from "../list-seller-request";
import { clx } from "@medusajs/ui";

interface SellerRequestDetailsModalProps {
  request: SellerRequest | null;
  isOpen: boolean;
  onClose: () => void;
  handlerUpdateState: (
    e: "id_accept" | "id_reject" | "id_correction",
    sellerRequestsId: string,
    comment?: string
  ) => void;
}

export const SellerRequestDetailsModal = ({
  request,
  isOpen,
  onClose,
  handlerUpdateState,
}: SellerRequestDetailsModalProps) => {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "id_reject" | "id_correction" | null
  >(null);
  const [comment, setComment] = useState("");

  if (!request) return null;

  const openCommentModal = (action: "id_reject" | "id_correction") => {
    setActionType(action);
    setIsCommentModalOpen(true);
  };

  const handleSubmitComment = () => {
    if (actionType && request) {
      handlerUpdateState(actionType, request.id, comment);
      setIsCommentModalOpen(false);
      setComment("");
    }
  };

  return (
    <>
      <FocusModal open={isOpen} onOpenChange={onClose}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading level="h2">Detalles de la Solicitud</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="space-y-6 p-6">
            <div>
              Detalles de la Solicitud {request.email}
              <br />
              Fecha Creación {request.created_at}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-ui-fg-subtle">Nombre Completo</Label>
                <Text>
                  {request.first_name} {request.last_name}
                </Text>
              </div>
              <div>
                <Label className="text-ui-fg-subtle">Email</Label>
                <Text>{request.email}</Text>
              </div>
              <div>
                <Label className="text-ui-fg-subtle">Teléfono</Label>
                <Text>{request.phone}</Text>
              </div>
              <div>
                <Label className="text-ui-fg-subtle">Estado</Label>
                <Badge
                  color={
                    request.status_id === "id_pending"
                      ? "orange"
                      : request.status_id === "id_accept"
                      ? "green"
                      : request.status_id === "id_correction"
                      ? "blue"
                      : request.status_id === "id_reject"
                      ? "red"
                      : "purple"
                  }
                >
                  {request.status_id}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-ui-fg-subtle">Dirección</Label>
              <Text>
                {request.address}, {request.city}, {request.region},{" "}
                {request.country}
              </Text>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-ui-fg-subtle">Sitio Web</Label>
                <a
                  href={request.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {request.website}
                </a>
              </div>
              <div>
                <Label className="text-ui-fg-subtle">Redes Sociales</Label>
                <Text>{request.social_media}</Text>
              </div>
              {/* Archivos */}
              <div>
                <Label className="text-ui-fg-subtle">Archivos</Label>
                <div className="flex flex-col gap-2">
                  <a
                    href={request.rutFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Ver RUT
                  </a>
                  <a
                    href={request.commerceFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Ver Comercio
                  </a>
                  <a
                    href={request.idFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Ver ID
                  </a>
                </div>
              </div>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => openCommentModal("id_correction")}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Corrección
            </Button>
            <Button
              variant="danger"
              onClick={() => openCommentModal("id_reject")}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Rechazar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                handlerUpdateState("id_accept", request.id);
                onClose();
              }}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Aprobar
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
      {isCommentModalOpen && (
        <FocusModal
          open={isCommentModalOpen}
          onOpenChange={() => setIsCommentModalOpen(false)}
        >
          <FocusModal.Content className="max-w-lg max-h-fit m-auto">
            <FocusModal.Header>
              <Heading
                level="h2"
                className={clx(
                  " text-white",
                  actionType == "id_correction"
                    ? "text-blue-500 "
                    : "text-red-500 "
                )}
              >
                {actionType === "id_correction"
                  ? "Solicitar Corrección"
                  : "Rechazar Solicitud"}
              </Heading>
            </FocusModal.Header>
            <FocusModal.Body className="space-y-4 p-6">
              <Text>
                <strong>
                  Solicitud de {request.first_name} - {request.email}
                </strong>
                {request.last_name}
              </Text>

              <Label className="text-ui-fg-subtle">Comentario</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="w-full p-2 border rounded-md"
              />
            </FocusModal.Body>
            <FocusModal.Footer className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsCommentModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitComment}
                className={clx(
                  " text-white",
                  actionType == "id_correction"
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                {actionType === "id_correction"
                  ? "Enviar Corrección"
                  : "Rechazar Solicitud"}
              </Button>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      )}
    </>
  );
};
