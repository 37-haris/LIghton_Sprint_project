from pydantic import BaseModel
from typing import List, Optional


# Here I define my users validation models using Pydantic. This allows FastAPI to automatically validate incoming JSON requests and provide clear error messages if the data is not in the expected format.
class TeamMember(BaseModel):
    name: str          # take the name here     
    role: str          # take the role here (e.g. frontend, backend, fullstack, etc.)
    seniority: str     # take the seniority here (e.g. junior, mid, senior, lead)


# Here I define the main request model for generating sprints. This model includes all the necessary information about the project and the team, which will be used to build the prompt for the language model.
class SprintRequest(BaseModel):
    project_name: str           # take the project name here
    project_description: str    # take a brief description of the project here
    team: List[TeamMember]      # take the list of team members here, and all the team members come from the above TeamMember model
    sprint_duration_weeks: int = 2 # default to 2 weeks if not provided
    sprint_count: int = 3       # default to 3 sprints if not provided
    tech_stack: Optional[str] = "" # take the tech stack here, or leave blank if not applicable