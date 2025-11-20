import grpc
from concurrent import futures
import time
import logging
import simulation_pb2
import simulation_pb2_grpc

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("LightingAgent")

class AgentService(simulation_pb2_grpc.AgentServiceServicer):
    def ExecuteCommand(self, request, context):
        logger.info(f"Received Command: {request.action} with params {request.parameters}")
        # Simulate action execution
        time.sleep(0.1)
        return simulation_pb2.CommandResponse(success=True, message="Action executed")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    simulation_pb2_grpc.add_AgentServiceServicer_to_server(AgentService(), server)
    server.add_insecure_port('[::]:50053')
    logger.info("Lighting Agent started on port 50053")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
