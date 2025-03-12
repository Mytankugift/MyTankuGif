import { useEffect, useState } from "react";
import { getListSellerRequest } from "./actions/seller-request/get-list-seller-request";
import { updateSellerRequest } from "./actions/seller-request/update-seller-request";
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Table, Button } from "@medusajs/ui";
import { SellerRequestDetailsModal } from "./components/modal-seller-request";
export interface SellerRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  website: string;
  social_media: string;
  rutFile: string;
  commerceFile: string;
  idFile: string;
  status_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const sellerRequestWidget = () => {
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SellerRequest | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, isLoading] = useState(true);

  const openModal = (request: SellerRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handlerUpdateState = (
    e: "id_accept" | "id_reject" | "id_correction",
    id: string,
    comment?: string
  ) => {
    updateSellerRequest(e, id, comment).then(() => {
      isLoading(true);
      setIsModalOpen(false);
      handlerGetListSellerRequest();
    });
  };

  const handlerGetListSellerRequest = async () => {
    const data = await getListSellerRequest().then((e) => {
      isLoading(false);
      return e;
    });
    setSellerRequests(data);
  };

  useEffect(() => {
    handlerGetListSellerRequest();
  }, []);

  return (
    <Container className="divide-y p-4">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Seller Requests</Heading>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Phone</Table.HeaderCell>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Country</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {!loading && !sellerRequests.length ? (
            "cargando..."
          ) : sellerRequests.length ? (
            sellerRequests?.map((request) => (
              <Table.Row key={request.id}>
                <Table.Cell>
                  {request.first_name} {request.last_name}
                </Table.Cell>
                <Table.Cell>{request.email}</Table.Cell>
                <Table.Cell>{request.phone}</Table.Cell>
                <Table.Cell>{request.city}</Table.Cell>
                <Table.Cell>{request.country}</Table.Cell>
                <Table.Cell>{request.status_id}</Table.Cell>
                <Table.Cell>
                  <Button onClick={() => openModal(request)}>
                    View Details
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))
          ) : (
            <></>
          )}
        </Table.Body>
      </Table>
      {!sellerRequests.length && (
        <div className="w-[100%] text-center text-xl m-12">
          Aún no hay solicitudes de vendedor.
        </div>
      )}
      <SellerRequestDetailsModal
        handlerUpdateState={handlerUpdateState}
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.list.before",
});

export default sellerRequestWidget;
