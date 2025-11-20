import grpc
from concurrent import futures
import time
import os
import logging
import simulation_pb2
import simulation_pb2_grpc

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SimController")

ROBOT_AGENT_HOST = os.environ.get('ROBOT_AGENT_HOST', 'localhost')
ROBOT_AGENT_PORT = os.environ.get('ROBOT_AGENT_PORT', '50052')
LIGHTING_AGENT_HOST = os.environ.get('LIGHTING_AGENT_HOST', 'localhost')
LIGHTING_AGENT_PORT = os.environ.get('LIGHTING_AGENT_PORT', '50053')

class ControllerService(simulation_pb2_grpc.ControllerServiceServicer):
    def __init__(self):
        self.robot_stub = self._connect_to_agent(ROBOT_AGENT_HOST, ROBOT_AGENT_PORT, "RobotArm")
        self.lighting_stub = self._connect_to_agent(LIGHTING_AGENT_HOST, LIGHTING_AGENT_PORT, "Lighting")

    def _connect_to_agent(self, host, port, name):
        channel = grpc.insecure_channel(f'{host}:{port}')
        stub = simulation_pb2_grpc.AgentServiceStub(channel)
        logger.info(f"Initialized connection to {name} agent at {host}:{port}")
        return stub

    def PublishAudioEvent(self, request, context):
        logger.info(f"Received AudioEvent: {request.event_type} value={request.value}")
        
        # Simple logic: Route BEAT to Robot, PITCH_CHANGE to Lighting
        if request.event_type == "BEAT":
            self._send_command(self.robot_stub, "robot-arm", "DANCE", {"intensity": str(request.value)})
        elif request.event_type == "PITCH_CHANGE":
            self._send_command(self.lighting_stub, "lighting", "CHANGE_COLOR", {"pitch": str(request.value)})
        
        return simulation_pb2.EventResponse(success=True)

    def _send_command(self, stub, agent_name, action, params):
        try:
            command = simulation_pb2.SimulationCommand(
                target_agent=agent_name,
                action=action,
                parameters=params
            )
            response = stub.ExecuteCommand(command)
            logger.info(f"Sent command to {agent_name}: {action}. Success: {response.success}")
        except grpc.RpcError as e:
            logger.error(f"Failed to send command to {agent_name}: {e}")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    simulation_pb2_grpc.add_ControllerServiceServicer_to_server(ControllerService(), server)
    server.add_insecure_port('[::]:50051')
    logger.info("Controller Service started on port 50051")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
